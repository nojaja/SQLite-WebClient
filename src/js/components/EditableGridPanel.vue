<template>
  <div class="results-grid editable-grid-panel">
    <div class="results-toolbar">
      <button :id="`add-row-button-${gridId}`" class="toolbar-button" @click="addRow" :title="addRowTooltip">
        <span class="material-symbols-outlined">add</span> 行の追加
      </button>
      <button :id="`delete-row-button-${gridId}`" class="toolbar-button" @click="deleteRow" :disabled="!canDeleteRow" title="選択行を削除">
        <span class="material-symbols-outlined">delete</span> 行の削除
      </button>
      <button :id="`generate-query-button-${gridId}`" class="toolbar-button" @click="generateCreateQuery" :title="generateQueryTooltip">
        <span class="material-symbols-outlined">query_builder</span> クエリを生成
      </button>
      <button :id="`generate-update-query-button-${gridId}`" class="toolbar-button" @click="generateUpdateQuery" :title="generateUpdateQueryTooltip">
        <span class="material-symbols-outlined">edit</span> 変更クエリを生成
      </button>
      <button :id="`undo-changes-button-${gridId}`" class="toolbar-button" @click="undoChanges" :disabled="!canUndo" title="変更を戻す">
        <span class="material-symbols-outlined">undo</span> 変更を戻す
      </button>
    </div>
    <div :id="`editable-grid-${gridId}`" class="editable-grid-host"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue';
import { TabulatorFull as Tabulator } from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';

defineOptions({ name: 'EditableGridPanel' });

interface Props {
  gridId: string;
  tableName?: string;
  columns: Array<{
    title: string;
    field: string;
    editor?: string;
    editorParams?: Record<string, unknown>;
    mutator?: (value: unknown) => unknown;
    cssClass?: string;
  }>;
  data: Record<string, unknown>[];
  mode?: 'table-definition' | 'table-data'; // モード判定
  primaryKeyField?: string; // テーブル編集時のキーフィールド（ROWID等）
}

interface Emits {
  (e: 'query-generated', query: string): void;
  (e: 'update-query-generated', query: string): void;
}

const props = defineProps<Props>();

const emit = defineEmits<Emits>();

// デフォルト値の設定
const mode = computed(() => props.mode ?? 'table-data');
const primaryKeyField = computed(() => props.primaryKeyField ?? 'rowid');
const targetTableName = computed(() => props.tableName ?? 'my_table');

let tabulatorInstance: Tabulator | null = null;
const selectedRows = ref<any[]>([]);
const selectedRow = ref<any | null>(null);
const originalData = ref<Record<string, unknown>[]>([]);

/**
 * 処理名: 編集行取得
 * 処理概要: Tabulator インスタンスから編集済み行データ配列を取得する
 * 実装理由: getEditedData が未提供の環境でも変更クエリ生成を継続するため
 * @returns 編集済み行データ配列
 */
const getEditedRows = (): Record<string, unknown>[] => {
  if (!tabulatorInstance) return [];

  const withEditedData = tabulatorInstance as unknown as {
    getEditedData?: () => Record<string, unknown>[];
    getEditedCells?: () => Array<{ getRow: () => { getData: () => Record<string, unknown> } }>;
  };

  if (typeof withEditedData.getEditedData === 'function') {
    return withEditedData.getEditedData();
  }

  if (typeof withEditedData.getEditedCells === 'function') {
    const editedCells = withEditedData.getEditedCells();
    const uniqueRows = new Map<string, Record<string, unknown>>();
    editedCells.forEach((cell, index) => {
      const rowData = cell.getRow().getData();
      const rowKey = JSON.stringify(rowData) || String(index);
      if (!uniqueRows.has(rowKey)) uniqueRows.set(rowKey, rowData);
    });
    return Array.from(uniqueRows.values());
  }

  return [];
};

// 編集セル・追加行・削除行・更新行いずれかがあればundo可
// Tabulatorのデータ変更イベントでインクリメントされるダミーref
const dummyVersion = ref(0);
const canUndo = computed(() => {
  // dummyVersionを依存に加えることで、Tabulatorのデータ変更時に再計算される
  void dummyVersion.value;
  if (!tabulatorInstance) return false;
  const { addedRows, updatedRows, deletedRows } = collectTableDataChanges();
  const edited = getEditedRows().length > 0;
  return edited || addedRows.length > 0 || updatedRows.length > 0 || deletedRows.length > 0;
});
const canDeleteRow = computed(() => selectedRows.value.length > 0 || selectedRow.value !== null);

const addRowTooltip = computed(() => 
  mode.value === 'table-definition' ? '新しいフィールドを追加' : '新しい行を追加'
);

const generateQueryTooltip = computed(() => 
  mode.value === 'table-definition' ? 'CREATE TABLE文を生成' : 'INSERT文を生成'
);

const generateUpdateQueryTooltip = computed(() => 
  mode.value === 'table-definition' ? 'ALTER TABLE文を生成' : 'UPDATE文を生成'
);

/**
 * 処理名: SQLリテラル変換
 * 処理概要: 値を SQL 文で利用可能な文字列表現に変換する
 * 実装理由: INSERT/UPDATE/DELETE 文の値埋め込みを共通化するため
 * @param value 変換対象値
 * @returns SQL リテラル
 */
const toSqlLiteral = (value: unknown): string => {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'string') return `'${String(value).replace(/'/g, "''")}'`;
  return String(value);
};

/**
 * 処理名: テーブルデータ差分抽出
 * 処理概要: 追加行・更新行・削除行を現在データと初期データから抽出する
 * 実装理由: 単表編集モードで差分ベースのSQLを生成するため
 * @returns 差分情報
 */
const collectTableDataChanges = () => {
  if (!tabulatorInstance) {
    return {
      columns: [] as string[],
      addedRows: [] as Record<string, unknown>[],
      updatedRows: [] as Record<string, unknown>[],
      deletedRows: [] as Record<string, unknown>[],
    };
  }

  const columns = props.columns
    .filter((col) => col.field !== primaryKeyField.value)
    .map((col) => col.field);

  const currentData = tabulatorInstance.getData() as Record<string, unknown>[];
  /**
   * 処理名: 主キー存在判定
   * 処理概要: 行データに主キー値が存在するか判定する
   * 実装理由: 追加行（主キー未採番）と既存行を判別するため
   * @param row 行データ
   * @returns 主キー値が存在する場合 true
   */
  const hasPrimaryKey = (row: Record<string, unknown>) =>
    row[primaryKeyField.value] !== null && row[primaryKeyField.value] !== undefined;

  const originalRowsByPk = new Map<string, Record<string, unknown>>(
    originalData.value
      .filter(hasPrimaryKey)
      .map((row) => [String(row[primaryKeyField.value]), row])
  );

  const currentRowsByPk = new Map<string, Record<string, unknown>>(
    currentData
      .filter(hasPrimaryKey)
      .map((row) => [String(row[primaryKeyField.value]), row])
  );

  const addedRows = currentData.filter((row) => !hasPrimaryKey(row));

  const updatedRows = currentData.filter((row) => {
    if (!hasPrimaryKey(row)) return false;
    const originalRow = originalRowsByPk.get(String(row[primaryKeyField.value]));
    if (!originalRow) return false;
    return columns.some((col) => row[col] !== originalRow[col]);
  });

  const deletedRows = originalData.value.filter((row) => {
    if (!hasPrimaryKey(row)) return false;
    return !currentRowsByPk.has(String(row[primaryKeyField.value]));
  });

  return { columns, addedRows, updatedRows, deletedRows };
};

/**
 * 処理名: Tabulator初期化
 * 処理概要: Tabulatorインスタンスを生成し、グリッドを描画する
 * 実装理由: コンポーネントマウント時にグリッドを初期化するため
 */
const initializeTabulatorInstance = () => {
  const hostElement = document.getElementById(`editable-grid-${props.gridId}`);
  if (!hostElement) return;

  // オリジナルデータを保存
  originalData.value = JSON.parse(JSON.stringify(props.data));

  const tabulatorOptions = {
    layout: 'fitDataStretch' as const,
    pagination: true,
    paginationMode: 'local' as const,
    paginationSize: 50,
    selectableRows: 1,
    cellEdited: onCellEdited,
    columns: props.columns,
    data: props.data,
  };

  tabulatorInstance = new Tabulator(hostElement, tabulatorOptions);
  tabulatorInstance.on('cellClick', onCellClick);
  tabulatorInstance.on('rowClick', onRowClick);
  tabulatorInstance.on('rowSelectionChanged', onRowSelectionChanged);
  // データ変更時にdummyVersionをインクリメント
  tabulatorInstance.on('rowDeleted', () => { dummyVersion.value++; });
  tabulatorInstance.on('rowAdded', () => { dummyVersion.value++; });
  tabulatorInstance.on('cellEdited', () => { dummyVersion.value++; });
};

/**
 * 処理名: セル編集完了ハンドラ
 * 処理概要: セル編集時にその行の背景色を薄いピンクに変更する
 * 実装理由: 編集状態を視覚的に表現するため
 * @param cell セルコンポーネント
 */
const onCellEdited = (cell: any) => {
  const row = cell.getRow?.();
  if (row) {
    const element = row.getElement?.();
    if (element) {
      element.style.backgroundColor = '#ffe0e6';
    }
  }
};

/**
 * 処理名: セルクリックハンドラ
 * 処理概要: クリックしたセルの行を削除対象として保持する
 * 実装理由: 単表編集で行削除ボタンを押せる状態にするため
 * @param _event マウスイベント（未使用）
 * @param cell セルコンポーネント
 */
const onCellClick = (_event: Event, cell: any) => {
  const row = cell.getRow?.();
  if (!row) return;
  row.select?.();
  selectedRow.value = row;
  selectedRows.value = [row];
};

/**
 * 処理名: 行クリックハンドラ
 * 処理概要: クリックした行を削除対象として保持する
 * 実装理由: セルクリック以外でも削除ボタンを確実に有効化するため
 * @param _event マウスイベント（未使用）
 * @param row 行コンポーネント
 */
const onRowClick = (_event: Event, row: any) => {
  if (!row) return;
  selectedRow.value = row;
  selectedRows.value = [row];
};

/**
 * 処理名: 行選択変更ハンドラ
 * 処理概要: 選択行のデータを保持する
 * 実装理由: 削除操作で選択行を特定するため
 * @param _data 選択中の行データ配列（未使用）
 * @param rows 選択中の行コンポーネント配列
 */
const onRowSelectionChanged = (_data: any[], rows: any[]) => {
  if (rows.length > 0) {
    selectedRows.value = rows;
    selectedRow.value = rows[0];
  }
};

/**
 * 処理名: 行追加
 * 処理概要: グリッドに新規行を追加する
 * 実装理由: テーブル定義またはテーブルデータの拡張を行うため
 */
const addRow = () => {
  if (!tabulatorInstance) return;
  const newRow: Record<string, unknown> = {};
  props.columns.forEach(col => {
    if (col.field !== primaryKeyField.value) {
      newRow[col.field] = null;
    }
  });
  tabulatorInstance.addRow(newRow);
};

/**
 * 処理名: 行削除
 * 処理概要: 選択された行を削除する
 * 実装理由: テーブル定義またはテーブルデータから行を削除するため
 */
const deleteRow = () => {
  if (!tabulatorInstance) return;
  const rowsToDelete = selectedRows.value.length > 0
    ? selectedRows.value
    : (selectedRow.value ? [selectedRow.value] : []);
  if (rowsToDelete.length === 0) return;

  rowsToDelete.forEach(row => {
    row?.delete?.();
  });
  selectedRows.value = [];
  selectedRow.value = null;
};

/**
 * 処理名: CREATE文生成
 * 処理概要: 現在のグリッドデータからCREATE TABLE/テーブル定義のINSERTを生成
 * 実装理由: ツールバーの「クエリを生成」ボタンで SQL を出力するため
 */
const generateCreateQuery = () => {
  if (!tabulatorInstance) return;
  // getData() で全行データを取得
  const allData = tabulatorInstance.getData() as Record<string, unknown>[];
  
  let query = '';
  if (mode.value === 'table-definition') {
    // CREATE TABLE 文を生成
    const columnDefs = allData
      .map(row => {
        const name = row.name;
        const type = row.type || 'TEXT';
        const notNull = row.notnull ? ' NOT NULL' : '';
        const defaultVal = row.dflt_value ? ` DEFAULT ${row.dflt_value}` : '';
        return `  ${name} ${type}${notNull}${defaultVal}`;
      })
      .join(',\n');
    query = `CREATE TABLE ${targetTableName.value} (\n${columnDefs}\n);`;
  } else {
    // 単表編集モード: 現在表示中の全行（削除行を除外）を INSERT で生成
    const columns = props.columns
      .filter((col) => col.field !== primaryKeyField.value)
      .map((col) => col.field);
    const currentData = tabulatorInstance.getData() as Record<string, unknown>[];
    const statements = currentData.map((row) => {
      const values = columns.map((col) => toSqlLiteral(row[col])).join(', ');
      return `INSERT INTO ${targetTableName.value} (${columns.join(', ')}) VALUES (${values});`;
    });
    query = statements.join('\n');
  }
  
  emit('query-generated', query);
};

/**
 * 処理名: UPDATE/ALTER文生成
 * 処理概要: 編集されたデータからUPDATE/ALTER文を生成
 * 実装理由: ツールバーの「変更クエリを生成」ボタンで変更クエリを出力するため
 */
const generateUpdateQuery = () => {
  if (!tabulatorInstance) return;
  // getEditedData() 優先で編集されたデータのみを取得（未対応環境は getEditedCells() で代替）
  const editedData = getEditedRows();
  
  let query = '';
  if (mode.value === 'table-definition') {
    // ALTER TABLE 文を生成
    const alterStatements = editedData
      .map(row => {
        const name = row.name;
        const type = row.type || 'TEXT';
        const notNull = row.notnull ? ' NOT NULL' : '';
        return `ALTER TABLE ${targetTableName.value} ADD COLUMN ${name} ${type}${notNull};`;
      });
    query = alterStatements.join('\n');
  } else {
    // 単表編集モード: 追加行は INSERT、削除行は DELETE、既存行変更は UPDATE を生成
    const { columns, addedRows, updatedRows, deletedRows } = collectTableDataChanges();
    const statements: string[] = [];

    addedRows.forEach((row) => {
      const values = columns.map((col) => toSqlLiteral(row[col])).join(', ');
      statements.push(`INSERT INTO ${targetTableName.value} (${columns.join(', ')}) VALUES (${values});`);
    });

    updatedRows.forEach((row) => {
      const pkVal = row[primaryKeyField.value];
      if (pkVal === null || pkVal === undefined) return;

      const originalRow = originalData.value.find(
        (candidate) => String(candidate[primaryKeyField.value]) === String(pkVal)
      );
      if (!originalRow) return;

      const changedColumns = columns.filter((col) => row[col] !== originalRow[col]);
      if (changedColumns.length === 0) return;

      const sets = changedColumns
        .map((col) => `${col} = ${toSqlLiteral(row[col])}`)
        .join(', ');
      statements.push(
        `UPDATE ${targetTableName.value} SET ${sets} WHERE ${primaryKeyField.value} = ${toSqlLiteral(pkVal)};`
      );
    });

    deletedRows.forEach((row) => {
      const pkVal = row[primaryKeyField.value];
      if (pkVal === null || pkVal === undefined) return;
      statements.push(`DELETE FROM ${targetTableName.value} WHERE ${primaryKeyField.value} = ${toSqlLiteral(pkVal)};`);
    });

    query = statements.join('\n');
  }
  
  emit('update-query-generated', query);
};

/**
 * 処理名: 変更を戻す
 * 処理概要: グリッドをオリジナルデータの状態に戻す
 * 実装理由: ツールバーの「変更を戻す」ボタンで編集をリセットするため
 */
const undoChanges = () => {
  if (!tabulatorInstance) return;
  tabulatorInstance.setData(JSON.parse(JSON.stringify(originalData.value)));
  // 編集状態をリセット
  selectedRows.value = [];
  selectedRow.value = null;
};

/**
 * 処理名: Tabulatorインスタンス取得
 * 処理概要: グリッド操作が必要な場合に内部インスタンスを返す
 * 実装理由: 親コンポーネントがgetEditedData()を直接呼ぶ際に必要
 * @returns Tabulator インスタンス。未初期化時は null
 */
const getTabulatorInstance = () => tabulatorInstance;

onMounted(() => {
  initializeTabulatorInstance();
});

onBeforeUnmount(() => {
  if (tabulatorInstance) {
    tabulatorInstance.destroy();
    tabulatorInstance = null;
  }
});

defineExpose({
  getTabulatorInstance,
  undoChanges,
  addRow,
  deleteRow,
});
</script>

<style scoped>
.editable-grid-panel {
  height: 100%;
  min-height: 0;
}

.editable-grid-host {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}
</style>
