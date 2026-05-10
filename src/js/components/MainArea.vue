<template>
  <div id="main-area" class="main-area" v-show="queryTabs.length > 0">
    <!-- クエリタブ -->
    <div id="query-tabs" class="query-tabs">
      <div
        v-for="tab in queryTabs"
        :key="tab.id"
        class="query-tab"
        :class="{ active: tab.id === activeQueryTabId }"
        :data-tab-id="tab.id"
        @click="switchQueryTab(tab.id)"
      >
        {{ tab.label }}<span class="close-tab" @click.stop="closeQueryTab(tab.id)">×</span>
      </div>
    </div>

    <!-- クエリエリア（単一MonacoEditorをアクティブタブで共有） -->
    <div
      id="query-editor"
      class="query-editor"
      ref="queryEditorEl"
      :class="{ 'drop-target-active': isQueryDropActive, 'drop-target-invalid': isQueryDropInvalid }"
      @dragenter.prevent="onQueryEditorDragEnter"
      @dragleave.prevent="onQueryEditorDragLeave"
      @dragover.capture.prevent="onQueryEditorDragOver"
      @drop.capture.prevent="onQueryEditorDrop"
    >
      <div v-if="isQueryDropActive" class="query-drop-indicator" :class="{ invalid: isQueryDropInvalid }">
        {{ isQueryDropInvalid ? 'この場所には .sql のみドロップできます' : 'SQLファイルをドロップしてクエリを読み込む' }}
      </div>
      <MonacoEditor
        id="sql-editor"
        :value="activeTabQuery"
        @change="updateActiveTabQuery"
        @editorDidMount="onEditorMounted"
        language="sql"
        :options="monacoOptions"
        style="width: 100%; height: 100%;"
      />
    </div>

    <!-- 水平スプリッター -->
    <div class="row-splitter" ref="rowSplitterEl"></div>

    <!-- パネルエリア -->
    <div class="panel-area">
      <!-- 結果タブ -->
      <div class="results-tabs">
        <div
          v-for="tab in resultTabs"
          :key="tab.id"
          class="result-tab"
          :class="{ active: tab.id === activeResultTabId }"
          :data-results-id="tab.resultsId"
          @click="switchResultTab(tab.id)"
        >
          {{ tab.label }}
          <span v-if="tab.closable" class="close-tab" @click.stop="removeResultTab(tab.id)">×</span>
        </div>
        <!-- 編集可能グリッドタブ -->
        <div
          v-for="tab in editableGridTabs"
          :key="tab.id"
          class="result-tab"
          :class="{ active: activeResultTabId === tab.id }"
          @click="switchResultTab(tab.id)"
        >
          {{ tab.label }}
          <span class="close-tab" @click.stop="closeEditableGridTab(tab.id)">×</span>
        </div>
      </div>

      <!-- 結果エリア -->
      <div id="results-area" class="results-area" :style="{ display: showResultsArea ? '' : 'none' }">
        <NormalResultsPanel
          :visible="isNormalResultsPanelVisible"
          :result-tabs="resultTabs"
          :active-result-tab-id="activeResultTabId"
          :show-results-menu-bar="showResultsMenuBar"
          :has-result-grid-data="hasResultGridData"
          @register-dataset="$emit('register-dataset')"
          @download-csv="$emit('download-csv')"
        />
        <EditableGridViewPanel
          :visible="isEditableGridPanelVisible"
          :editable-grid-tabs="editableGridTabs"
          :active-result-tab-id="activeResultTabId"
          @query-generated="onEditableGridQueryGenerated"
          @update-query-generated="onEditableGridUpdateQueryGenerated"
        />

      </div>

      <!-- メッセージエリア -->
      <div
        id="messages-area"
        class="messages-area"
        v-show="showMessagesArea"
      >
        <div v-for="(msg, i) in messages" :key="i">{{ msg }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick, onBeforeUnmount } from 'vue';
import MonacoEditor from 'monaco-editor-vue3';
import * as monaco from 'monaco-editor';
import { formatSqlText } from '../sqlFormatter';
import { formatIdentifier } from '../datasetDb';
import { TabulatorFull as Tabulator } from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';
import { useRowSplitter } from '../composables/useRowSplitter';
import EditableGridViewPanel from './EditableGridViewPanel.vue';
import NormalResultsPanel from './NormalResultsPanel.vue';

const emit = defineEmits<{
  'register-dataset': [];
  'download-csv': [];
  'run-query': [];
  'drop-query': [files: File[]];
}>();

defineOptions({ name: 'AppMainArea' });

// ---- クエリタブ ----
interface QueryTab {
  id: string;
  label: string;
  query: string;
}

const queryTabs = ref<QueryTab[]>([{ id: 'query1', label: 'Query1', query: '' }]);
const activeQueryTabId = ref('query1');
let queryTabSerial = 2;
const sqlEditorRef = ref<monaco.editor.IStandaloneCodeEditor | null>(null);

/** Monacoエディタの設定オプション */
const monacoOptions = {
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  wordWrap: 'on' as const,
  fontSize: 14,
  lineNumbers: 'on' as const,
  automaticLayout: true,
  dragAndDrop: false,
};

/**
 * 処理名: アクティブタブのクエリ取得 (computed)
 * 処理概要: 現在アクティブなタブの SQL 文字列を返す computed
 * 実装理由: Monacoエディタの :value バインディングに使用するため
 */
const activeTabQuery = computed<string>(
  () => queryTabs.value.find(t => t.id === activeQueryTabId.value)?.query ?? ''
);

/**
 * 処理名: アクティブタブのクエリ更新
 * 処理概要: Monacoエディタの内容変更時にアクティブタブの query を更新する
 * 実装理由: Monacoの @change イベントハンドラとして使用するため
 * @param value Monacoエディタの現在内容
 */
const updateActiveTabQuery = (value: string) => {
  const tab = queryTabs.value.find(t => t.id === activeQueryTabId.value);
  if (tab) tab.query = value;
};

/**
 * 処理名: クエリタブ切り替え
 * 処理概要: 指定 ID のクエリタブをアクティブにする
 * 実装理由: タブクリック時にアクティブタブを切り替えるため
 * @param id タブ ID
 */
const switchQueryTab = (id: string) => {
  activeQueryTabId.value = id;
};

/**
 * 処理名: クエリタブ閉じる
 * 処理概要: 指定 ID のクエリタブを削除し、必要に応じて隣接タブにフォーカスを移す
 * 実装理由: タブ閉じるボタン操作に対応するため
 * @param id 閉じるタブ ID
 */
const closeQueryTab = (id: string) => {
  const idx = queryTabs.value.findIndex(t => t.id === id);
  if (idx === -1) return;
  queryTabs.value.splice(idx, 1);
  if (activeQueryTabId.value === id) {
    const next = queryTabs.value[Math.max(0, idx - 1)];
    if (next) activeQueryTabId.value = next.id;
  }
};

/**
 * 処理名: クエリタブ追加
 * 処理概要: 新規クエリタブをシリアル番号付きで追加しアクティブにする
 * 実装理由: メニューの「New Query」ボタンからタブを追加するため
 * @param label タブラベル（デフォルト: 'Query'）
 */
const addQueryTab = (label = 'Query') => {
  const id = `query${queryTabSerial++}`;
  const num = id.replace('query', '');
  queryTabs.value.push({ id, label: `${label}${num}`, query: '' });
  activeQueryTabId.value = id;
};

/**
 * 処理名: アクティブタブのクエリ取得
 * 処理概要: 現在アクティブなクエリタブの SQL 文字列を返す
 * 実装理由: 親コンポーネントのクエリ実行に使用するため
 * @returns アクティブタブの SQL 文字列
 */
const getActiveQuery = (): string => {
  return queryTabs.value.find(t => t.id === activeQueryTabId.value)?.query ?? '';
};

/**
 * 処理名: アクティブタブのクエリ設定
 * 処理概要: 現在アクティブなクエリタブの SQL 文字列を展開または書き換える
 * 実装理由: SQLファイル読み込み時にエディタ内容を設定するため
 * @param value 設定する SQL 文字列
 */
const setActiveQuery = (value: string) => {
  const tab = queryTabs.value.find(t => t.id === activeQueryTabId.value);
  if (tab) tab.query = value;
};

/**
 * 処理名: アクティブタブへクエリ追記
 * 処理概要: 現在のクエリ末尾に SQL 文字列を追記する
 * 実装理由: サイドバーのコンテキストメニュー操作で SQL を追記するため
 * @param value 追記する SQL 文字列
 */
const appendActiveQuery = (value: string) => {
  const tab = queryTabs.value.find(t => t.id === activeQueryTabId.value);
  if (!tab || !value) return;
  const needsSeparator = tab.query.trim().length > 0 && !tab.query.endsWith('\n');
  tab.query = `${tab.query}${needsSeparator ? '\n' : ''}${value}\n`;
};

// ---- 結果タブ ----
interface ResultData {
  columns: string[];
  data: Record<string, unknown>[];
}

const resultGridData = reactive<Map<string, ResultData>>(new Map());

const tabulatorInstances = reactive<Map<string, Tabulator>>(new Map());

const tabulatorOptions = {
  layout: 'fitDataStretch',
  pagination: true,
  paginationMode: 'local' as const,
  paginationSize: 50,
  selectableRows: false,
};

/**
 * 処理名: Tabulator表示要素取得
 * 処理概要: 指定テーブルIDに対応するTabulator表示要素を返す
 * 実装理由: 結果タブごとにTabulatorインスタンスを生成するため
 * @param tableId 結果テーブル ID
 * @returns Tabulator を描画する HTML 要素
 */
const getTabulatorHostElement = (tableId: string): HTMLElement | null => {
  return document.getElementById(`tabulator-${tableId}`);
};

/**
 * 処理名: Tabulator列定義生成
 * 処理概要: 列名配列からTabulator用の列定義配列を生成する
 * 実装理由: クエリ結果の列構成に応じて動的にテーブルを描画するため
 * @param columns 列名配列
 * @returns Tabulator 用列定義配列
 */
const buildTabulatorColumns = (columns: string[]) => {
  return columns.map((column) => ({
    title: column,
    field: column,
    formatter: 'textarea',
    variableHeight: true,
  }));
};

/**
 * 処理名: Tabulatorインスタンス破棄
 * 処理概要: 指定テーブルIDのTabulatorインスタンスを破棄する
 * 実装理由: タブ削除時や再描画時のメモリリークを防止するため
 * @param tableId 結果テーブル ID
 */
const destroyTabulatorInstance = (tableId: string) => {
  const instance = tabulatorInstances.get(tableId);
  if (!instance) return;
  instance.destroy();
  tabulatorInstances.delete(tableId);
};

/**
 * 処理名: Tabulator再描画
 * 処理概要: 指定テーブルIDに対応するTabulatorを生成し結果データを反映する
 * 実装理由: 列構成が変わるケースを確実に反映するため都度再生成を行う
 * @param tableId 結果テーブル ID
 */
const renderTabulatorForTable = (tableId: string) => {
  const hostElement = getTabulatorHostElement(tableId);
  const tableData = resultGridData.get(tableId);
  if (!hostElement || !tableData) return;

  destroyTabulatorInstance(tableId);
  const instance = new Tabulator(hostElement, {
    ...tabulatorOptions,
    columns: buildTabulatorColumns(tableData.columns),
    data: tableData.data,
  });
  tabulatorInstances.set(tableId, instance);
};

/**
 * 処理名: Tabulator再描画予約
 * 処理概要: DOM更新完了後にTabulator描画処理を実行する
 * 実装理由: タブ追加直後でも描画先要素を確実に取得するため
 * @param tableId 結果テーブル ID
 */
const scheduleTabulatorRender = async (tableId: string) => {
  await nextTick();
  renderTabulatorForTable(tableId);
};

/**
 * 処理名: Tabulator全破棄
 * 処理概要: 保持中のTabulatorインスタンスを全て破棄する
 * 実装理由: タブ全削除時およびコンポーネント破棄時の後始末を共通化するため
 */
const destroyAllTabulatorInstances = () => {
  Array.from(tabulatorInstances.keys()).forEach(destroyTabulatorInstance);
};

/**
 * 処理名: 結果データ存在確認
 * 処理概要: 指定タブ ID に結果データが存在するか確認する
 * 実装理由: Tabulator 描画前にデータの有無を判定するため
 * @param tableId 結果テーブル ID
 * @returns データが存在する場合 true
 */
const hasResultGridData = (tableId: string): boolean => resultGridData.has(tableId);
interface ResultTab {
  id: string;
  label: string;
  resultsId: string;
  closable: boolean;
}

const resultTabs = ref<ResultTab[]>([
  { id: 'messages-tab', label: 'Messages', resultsId: 'messages-area', closable: false },
]);
const activeResultTabId = ref('messages-tab');
const showResultsArea = ref(false);
const showMessagesArea = ref(true);
const showResultsMenuBar = ref(false);

/**
 * 処理名: 結果タブ切り替え
 * 処理概要: 指定タブをアクティブにし、Messages/結果エリアの表示状態を切り替える
 * 実装理由: タブクリック時に対応するエリアの表示切り替えを行うため
 * @param id タブ ID
 */
const switchResultTab = (id: string) => {
  activeResultTabId.value = id;
  const tab = resultTabs.value.find(t => t.id === id);
  if (!tab) return;
  if (tab.label === 'Messages') {
    showResultsArea.value = false;
    showMessagesArea.value = true;
    showResultsMenuBar.value = false;
  } else {
    showResultsArea.value = true;
    showMessagesArea.value = false;
    showResultsMenuBar.value = true;
  }
};

/**
 * 処理名: 結果タブ削除
 * 処理概要: 指定タブと結果データを削除し次のタブにフォーカスを移す
 * 実装理由: タブの × ボタン操作に対応するため
 * @param id 削除するタブ ID
 */
const removeResultTab = (id: string) => {
  const tab = resultTabs.value.find(t => t.id === id);
  if (!tab) return;
  destroyTabulatorInstance(tab.resultsId);
  resultGridData.delete(tab.resultsId);
  const idx = resultTabs.value.findIndex(t => t.id === id);
  resultTabs.value.splice(idx, 1);
  const remaining = resultTabs.value.filter(t => t.closable);
  switchResultTab(remaining.length > 0 ? remaining[0].id : 'messages-tab');
};

/**
 * 処理名: 結果タブ追加
 * 処理概要: 新規結果タブを Messages タブの手前に挿入しアクティブにする
 * 実装理由: クエリ実行結果をタブで表示するため
 * @param label タブの表示ラベル
 * @param tableId 結果テーブル ID
 */
const addResultTab = (label: string, tableId: string) => {
  const id = `result-tab-${tableId}`;
  const msgTabIdx = resultTabs.value.findIndex(t => t.id === 'messages-tab');
  const tab: ResultTab = { id, label, resultsId: tableId, closable: true };
  if (msgTabIdx !== -1) {
    resultTabs.value.splice(msgTabIdx, 0, tab);
  } else {
    resultTabs.value.push(tab);
  }
  switchResultTab(id);
};

/**
 * 処理名: 結果タブ全クリア
 * 処理概要: 閉じることができる結果タブとデータをすべて削除し初期状態に戻す
 * 実装理由: 新規クエリ実行前に前回結果をクリアするため
 */
const clearResultTabs = () => {
  destroyAllTabulatorInstances();
  resultTabs.value.filter(t => t.closable).forEach(t => resultGridData.delete(t.resultsId));
  resultTabs.value = resultTabs.value.filter(t => t.id === 'messages-tab');
  showResultsArea.value = false;
  showMessagesArea.value = true;
  showResultsMenuBar.value = false;
  activeResultTabId.value = 'messages-tab';
};

// ---- 編集可能グリッド管理 ----
interface EditableGridState {
  mode: 'table-definition' | 'table-data';
  alias: string;
  tableName: string;
  columns: Array<{
    title: string;
    field: string;
    editor?: string;
    editorParams?: Record<string, unknown>;
  }>;
  data: Record<string, unknown>[];
  primaryKeyField?: string;
}

interface EditableGridTab {
  id: string;
  label: string;
  state: EditableGridState;
}

const editableGridTabs = ref<EditableGridTab[]>([]);

const isEditableGridPanelVisible = computed(() =>
  activeResultTabId.value.startsWith('editable-grid-tab-')
);

const isNormalResultsPanelVisible = computed(() => {
  if (activeResultTabId.value === 'messages-tab') return false;
  return !isEditableGridPanelVisible.value;
});

/**
 * 処理名: 編集可能グリッドタブID生成
 * 処理概要: モード/DB/テーブル名から一意な編集タブIDを生成する
 * 実装理由: 同一画面で複数の編集可能グリッドを共存させるため
 * @param state 編集可能グリッド状態
 * @returns 編集可能グリッドタブID
 */
const buildEditableGridTabId = (state: EditableGridState): string => {
  const modePrefix = state.mode === 'table-definition' ? 'def' : 'data';
  return `editable-grid-tab-${modePrefix}-${state.alias}-${state.tableName}`;
};

/**
 * 処理名: 編集可能グリッドタブ表示
 * 処理概要: 編集タブを追加または更新してアクティブ化する
 * 実装理由: テーブル定義表示と単表編集を同時に複数保持するため
 * @param state 編集可能グリッド状態
 */
const openEditableGridTab = (state: EditableGridState): void => {
  const id = buildEditableGridTabId(state);
  const modeLabel = state.mode === 'table-definition' ? 'テーブル定義' : '単表編集';
  const label = `${modeLabel}: ${state.tableName}`;
  const index = editableGridTabs.value.findIndex((tab) => tab.id === id);

  if (index >= 0) {
    editableGridTabs.value[index] = { id, label, state };
  } else {
    editableGridTabs.value.push({ id, label, state });
  }

  showResultsArea.value = true;
  showMessagesArea.value = false;
  showResultsMenuBar.value = false;
  activeResultTabId.value = id;
};

/**
 * 処理名: 編集可能グリッドタブ閉じる
 * 処理概要: 指定された編集可能グリッドタブを閉じる
 * 実装理由: 編集タブを通常結果タブと同様に複数管理するため
 * @param id 閉じるタブID
 */
const closeEditableGridTab = (id: string) => {
  const index = editableGridTabs.value.findIndex((tab) => tab.id === id);
  if (index === -1) return;

  editableGridTabs.value.splice(index, 1);

  if (activeResultTabId.value === id) {
    const fallback = editableGridTabs.value[editableGridTabs.value.length - 1];
    if (fallback) {
      switchResultTab(fallback.id);
      return;
    }

    const normalResultTabs = resultTabs.value.filter((tab) => tab.closable);
    if (normalResultTabs.length > 0) {
      switchResultTab(normalResultTabs[0].id);
    } else {
      switchResultTab('messages-tab');
    }
  }
};

/**
 * 処理名: テーブル定義表示
 * 処理概要: 指定テーブルのスキーマをDBから取得して編集可能グリッドで表示する
 * 実装理由: Sidebar のテーブル右クリックメニュー「テーブル定義の表示」に対応するため
 * @param alias DBエイリアス
 * @param tableName テーブル名
 * @param dbManager SQLiteManager インスタンス
 */
const showTableDefinition = async (alias: string, tableName: string, dbManager: any) => {
  try {
    // PRAGMA table_info(tableName) でテーブルスキーマを取得
    const schemaPrefix = alias === 'main' ? '' : `${alias}.`;
    const results = dbManager.db.exec(
      `PRAGMA ${schemaPrefix ? `${alias}.` : ''}table_info(${tableName})`
    );
    
    if (!results.length || !results[0].values) {
      setMessages(`テーブル ${tableName} のスキーマ取得に失敗しました`);
      return;
    }

    // PRAGMA table_info の戻り値は：[cid, name, type, notnull, dflt_value, pk]
    const columns = results[0].values.map((row: unknown[]) => ({
      cid: row[0],
      name: row[1],
      type: row[2],
      notnull: row[3],
      dflt_value: row[4],
      pk: row[5]
    }));

    // Tabulator用の列定義を生成
    const tabulatorColumns = [
      { title: 'Field', field: 'name', editor: 'input' },
      {
        title: 'Type',
        field: 'type',
        editor: 'list',
        editorParams: {
          values: getSQLiteDataTypes(),
          autocomplete: true,
          listOnEmpty: true,
          clearable: true,
        },
      },
      {
        title: 'NOT NULL',
        field: 'notnull',
        formatter: 'tickCross',
        editor: 'tickCross',
        hozAlign: 'center',
        editorParams: {
          trueValue: true,
          falseValue: false,
        },
      },
      { title: 'Default', field: 'dflt_value', editor: 'input' },
      { title: 'Comment', field: 'comment', editor: 'input' }
    ];

    const gridData = columns.map((col: Record<string, unknown>) => ({
      name: col.name,
      type: col.type || 'TEXT',
      notnull: col.notnull === 1,
      dflt_value: col.dflt_value,
      comment: '',
      cid: col.cid,
      pk: col.pk
    }));

    openEditableGridTab({
      mode: 'table-definition',
      alias,
      tableName,
      columns: tabulatorColumns,
      data: gridData
    });
  } catch (error) {
    setMessages(`テーブル定義取得エラー: ${error}`);
  }
};

/**
 * 処理名: 数値系カラム判定
 * 処理概要: SQLite の宣言型から数値系カラムかを判定する
 * 実装理由: 単表編集で数値列に数値専用エディタを割り当てるため
 * @param declaredType PRAGMA table_info の type 値
 * @returns 数値系であれば true
 */
const isNumericColumnType = (declaredType: unknown): boolean => {
  const normalizedType = String(declaredType ?? '').toUpperCase().trim();
  if (!normalizedType) return false;
  if (normalizedType.includes('INT')) return true;
  if (normalizedType.includes('REAL')) return true;
  if (normalizedType.includes('FLOA')) return true;
  if (normalizedType.includes('DOUB')) return true;
  if (normalizedType.includes('NUMERIC')) return true;
  if (normalizedType.includes('DECIMAL')) return true;
  return false;
};

/**
 * 処理名: 数値セルバリデーション
 * 処理概要: 入力値が数値かを判定する
 * 実装理由: 数値系カラムで非数値や空文字の確定を防止するため
 * @param _cell Tabulator セル（未使用）
 * @param value 入力値
 * @returns 数値なら true
 */
const validateNumericOrEmpty = (_cell: unknown, value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return !Number.isNaN(value);
  const trimmed = String(value).trim();
  if (trimmed.length === 0) return false;
  return !Number.isNaN(Number(trimmed));
};

/**
 * 処理名: テーブルデータ編集表示
 * 処理概要: 指定テーブルの全データをDBから取得して編集可能グリッドで表示する
 * 実装理由: Sidebar のテーブル右クリックメニュー「単表編集」に対応するため
 * @param alias DBエイリアス
 * @param tableName テーブル名
 * @param dbManager SQLiteManager インスタンス
 */
const editTableData = async (alias: string, tableName: string, dbManager: any) => {
  try {
    // ROWIDを含めてデータ取得
    const qualifiedTableName = alias === 'main' 
      ? formatIdentifier(tableName)
      : `${formatIdentifier(alias)}.${formatIdentifier(tableName)}`;
    const selectQuery = `SELECT rowid, * FROM ${qualifiedTableName}`;
    const schemaPrefix = alias === 'main' ? '' : `${formatIdentifier(alias)}.`;
    const pragmaQuery = `PRAGMA ${schemaPrefix}table_info(${formatIdentifier(tableName)})`;
    
    const results = dbManager.db.exec(selectQuery);
    const schemaResults = dbManager.db.exec(pragmaQuery);
    if (!results.length) {
      setMessages(`テーブル ${tableName} のデータ取得に失敗しました`);
      return;
    }

    const columns = results[0].columns;
    const values = results[0].values;
    const schemaRows = schemaResults[0]?.values ?? [];
    const columnTypeMap = new Map<string, unknown>(
      schemaRows.map((row: unknown[]) => [String(row[1]), row[2]])
    );

    // Tabulator用の列定義を生成
    const tabulatorColumns = columns.map((colName: string) => {
      if (colName === 'rowid') {
        return {
          title: colName,
          field: colName,
          editor: undefined,
          cssClass: 'rowid-column'
        };
      }

      if (isNumericColumnType(columnTypeMap.get(colName))) {
        return {
          title: colName,
          field: colName,
          editor: 'number',
          editorParams: {
            step: 'any',
          },
          validator: validateNumericOrEmpty,
          cssClass: ''
        };
      }

      return {
        title: colName,
        field: colName,
        editor: 'input',
        cssClass: ''
      };
    });

    const gridData = values.map((row: unknown[]) =>
      Object.fromEntries(columns.map((col: string, idx: number) => [col, row[idx]]))
    );

    openEditableGridTab({
      mode: 'table-data',
      alias,
      tableName,
      columns: tabulatorColumns,
      data: gridData,
      primaryKeyField: 'rowid'
    });
  } catch (error) {
    setMessages(`テーブルデータ取得エラー: ${error}`);
  }
};

/**
 * 処理名: SQLite データ型一覧取得
 * 処理概要: SQLiteで利用可能なデータ型の一覧を返す
 * 実装理由: 編集可能グリッドの型セレクタに使用するため
 * @returns SQLiteで利用可能な型名一覧
 */
const getSQLiteDataTypes = (): string[] => [
  '',
  'NULL', 'INTEGER', 'REAL', 'TEXT', 'BLOB',
  'NUMERIC', 'BOOLEAN', 'DATE', 'TIME', 'DATETIME',
  'DECIMAL', 'DOUBLE', 'FLOAT', 'CHAR', 'VARCHAR'
];

/**
 * 処理名: 編集可能グリッド閉じる
 * 処理概要: 編集可能グリッドを閉じて通常の結果表示に戻す
 * 実装理由: グリッド表示の終了時に呼び出すため
 */
const closeEditableGrid = () => {
  if (!activeResultTabId.value.startsWith('editable-grid-tab-')) {
    switchResultTab('messages-tab');
    return;
  }
  closeEditableGridTab(activeResultTabId.value);
};

/**
 * 処理名: 編集可能グリッド クエリ生成ハンドラ
 * 処理概要: EditableGridPanel からの query-generated イベントを処理
 * 実装理由: 「クエリを生成」ボタンのクリック時にCREATE/INSERT文をエディタに追記するため
 * @param query 生成されたクエリ
 */
const onEditableGridQueryGenerated = (query: string) => {
  appendActiveQuery(query);
  setMessages(`クエリを生成しました: ${query.split('\n')[0]}`);
};

/**
 * 処理名: 編集可能グリッド 変更クエリ生成ハンドラ
 * 処理概要: EditableGridPanel からの update-query-generated イベントを処理
 * 実装理由: 「変更クエリを生成」ボタンのクリック時にUPDATE/ALTER文をエディタに追記するため
 * @param query 生成されたクエリ
 */
const onEditableGridUpdateQueryGenerated = (query: string) => {
  appendActiveQuery(query);
  setMessages(`変更クエリを生成しました: ${query.split('\n')[0]}`);
};

// ---- メッセージ ----
const messages = ref<string[]>([]);

/**
 * 処理名: メッセージ設定
 * 処理概要: Messages エリアに表示するメッセージを更新する
 * 実装理由: クエリ実行結果やエラー内容をユーザーに表示するため
 * @param msg 表示するメッセージ（文字列または配列）
 */
const setMessages = (msg: string | string[]) => {
  messages.value = Array.isArray(msg) ? msg : [msg];
};

// ---- 結果グリッドデータ管理 ----
/**
 * 処理名: 結果グリッドデータ設定
 * 処理概要: 指定タブに結果データをセットし Tabulator を描画する
 * 実装理由: クエリ結果をタブ単位の Tabulator に反映するため
 * @param tableId 結果テーブル ID
 * @param data 結果データオブジェクト
 * @param data.columns 列名配列
 * @param data.results 行データ配列
 */
const setResultGridData = (tableId: string, data: { columns: string[]; results: Record<string, unknown>[] }) => {
  const columns = [...data.columns];
  const normalizedRows = data.results.map((row) => {
    const normalizedRow: Record<string, unknown> = {};
    columns.forEach((column) => {
      const value = Object.prototype.hasOwnProperty.call(row, column) ? row[column] : null;
      normalizedRow[column] = value === undefined ? null : value;
    });
    return normalizedRow;
  });

  resultGridData.set(tableId, { columns, data: normalizedRows });
  void scheduleTabulatorRender(tableId);
};

/**
 * 処理名: アクティブ結果データ取得
 * 処理概要: アクティブな結果タブのデータを返す（CSVダウンロード・データセット登録に使用）
 * 実装理由: アクティブタブの結果を親コンポーネントに渡すため
 * @returns 結果データまたはアクティブタブがない場合 null
 */
const getCurrentResultData = (): ResultData | null => {
  const activeTab = resultTabs.value.find(t => t.id === activeResultTabId.value && t.closable);
  if (!activeTab) return null;
  return resultGridData.get(activeTab.resultsId) ?? null;
};

/**
 * 処理名: クエリ実行ショートカット処理
 * 処理概要: Ctrl+Enter でクエリ実行イベントを発火する
 * 実装理由: addAction の無名関数を避けて可読性と JSDoc 要件を満たすため
 */
const runQueryShortcut = () => {
  emit('run-query');
};

/**
 * 処理名: 位置指定テキスト挿入
 * 処理概要: ツリー項目のドロップ時にアクティブタブ末尾へテキストを追記する
 * 実装理由: Monaco の executeEdits を直接呼ぶと Language Worker が起動し
 *           Playwright のテストや drop イベントハンドラ内でハングするため、
 *           Vue リアクティブ状態経由の appendActiveQuery を使用する
 * @param text 挿入する文字列
 * @param _clientX ドロップ座標X（将来の位置指定挿入実装のために予約）
 * @param _clientY ドロップ座標Y（将来の位置指定挿入実装のために予約）
 */
const insertTextAtClientPoint = (text: string, _clientX: number, _clientY: number) => {
  if (!text) return;
  appendActiveQuery(text);
};

/**
 * 処理名: Monacoエディタマウント時ハンドラ
 * 処理概要: Ctrl+Enter ショートカットでクエリ実行イベントを発火する
 * 実装理由: query-editor フォーカス中にキーボードからクエリを実行できるようにするため
 * @param editor Monacoエディタインスタンス
 */
const onEditorMounted = (editor: monaco.editor.IStandaloneCodeEditor) => {
  sqlEditorRef.value = editor;
  editor.addAction({
    id: 'run-query-shortcut',
    label: 'Run Query',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
    run: runQueryShortcut,
  });
  editor.addAction({
    id: 'format-document-menu',
    label: 'ドキュメントのフォーマット',
    contextMenuGroupId: '1_modification',
    /* eslint-disable-line jsdoc/require-jsdoc */run: () => {
      formatQuery();
    },
  });
};

/**
 * 処理名: SQL クエリフォーマット
 * 処理概要: アクティブなエディタに対して SQL フォーマット機能を実行する
 * 実装理由: App.vue の format-query イベントハンドラから呼び出されるため
 */
const formatQuery = () => {
  const original = getActiveQuery();
  const formatted = formatSqlText(original);
  if (formatted !== original) {
    setActiveQuery(formatted);
  }
};

/**
 * 処理名: コンテキストメニュー形式フォーマット実行
 * 処理概要: Monacoの「ドキュメントのフォーマット」アクションを直接実行する
 * 実装理由: テストからコンテキストメニューと同一経路を安定して呼び出すため
 * @returns Promise<void>
 */
const runFormatMenuAction = async (): Promise<void> => {
  const action = sqlEditorRef.value?.getAction('format-document-menu');
  if (action) {
    await action.run();
    return;
  }
  formatQuery();
};
// ---- クエリエディタ D&D ----
const SQL_FILE_NAME_PATTERN = /\.sql$/i;
const TREE_ITEM_TRANSFER_TYPE = 'application/x-sqlite-webclient-tree-item-name';
const PLAIN_TEXT_TRANSFER_TYPE = 'text/plain';
const isQueryDropActive = ref(false);
const isQueryDropInvalid = ref(false);
let queryDragDepth = 0;

/**
 * 処理名: ファイルドラッグ判定
 * 処理概要: DragEvent がファイルを含むドラッグかどうかを判定する
 * 実装理由: テキストやリンクのドラッグにはドロップ表示を出さないため
 * @param e ドラッグイベント
 * @returns ファイルドラッグであれば true
 */
const isFileDragEvent = (e: DragEvent): boolean => {
  const items = Array.from(e.dataTransfer?.items ?? []);
  return items.some(item => item.kind === 'file');
};

/**
 * 処理名: ツリー項目ドラッグ判定
 * 処理概要: DragEvent がツリー項目ドラッグかどうかを判定する
 * 実装理由: ファイル D&D と tree-item D&D の挙動を分岐するため
 * @param e ドラッグイベント
 * @returns ツリー項目ドラッグであれば true
 */
const isTreeItemDragEvent = (e: DragEvent): boolean => {
  const types = Array.from(e.dataTransfer?.types ?? []);
  if (types.includes(TREE_ITEM_TRANSFER_TYPE)) return true;
  // 一部ブラウザ操作では custom MIME が欠落し text/plain のみ残ることがある。
  // ファイルD&Dでない text/plain は tree-item として扱う。
  return !isFileDragEvent(e) && types.includes(PLAIN_TEXT_TRANSFER_TYPE);
};

/**
 * 処理名: ツリー項目名抽出
 * 処理概要: DragEvent から挿入対象の項目名を取り出す
 * 実装理由: ドロップ時に挿入文字列を取得するため
 * @param e ドラッグイベント
 * @returns 挿入対象の文字列
 */
const getDraggedTreeItemName = (e: DragEvent): string => {
  if (!e.dataTransfer) return '';
  const customName = e.dataTransfer.getData(TREE_ITEM_TRANSFER_TYPE).trim();
  if (customName) return customName;
  return e.dataTransfer.getData(PLAIN_TEXT_TRANSFER_TYPE).trim();
};

/**
 * 処理名: SQLファイル判定
 * 処理概要: DragEvent 内にサポート対象の .sql ファイルが含まれるか判定する
 * 実装理由: ドロップ可否に応じて視覚表示と dropEffect を切り替えるため
 * @param e ドラッグイベント
 * @returns .sql ファイルが含まれる場合 true
 */
const hasSupportedSqlFile = (e: DragEvent): boolean => {
  const files = Array.from(e.dataTransfer?.files ?? []);
  if (files.length > 0) return files.some(f => SQL_FILE_NAME_PATTERN.test(f.name));
  const items = Array.from(e.dataTransfer?.items ?? []).filter(i => i.kind === 'file');
  if (items.length === 0) return false;
  let hasUnknown = false;
  for (const item of items) {
    const file = item.getAsFile();
    if (!file) { hasUnknown = true; continue; }
    if (SQL_FILE_NAME_PATTERN.test(file.name)) return true;
  }
  return hasUnknown;
};

/**
 * 処理名: クエリエディタドロップ状態更新
 * 処理概要: クエリエディタのドロップ可視状態と可否状態を更新する
 * 実装理由: dragenter/dragover/drop で状態遷移を共通化するため
 * @param active ドロップ状態を有効化するか
 * @param invalid サポート外ファイル状態か
 */
const setQueryDropState = (active: boolean, invalid = false) => {
  isQueryDropActive.value = active;
  isQueryDropInvalid.value = active && invalid;
};

/**
 * 処理名: クエリエディタドラッグエンターハンドラ
 * 処理概要: SQLファイルドラッグ進入時にドロップ可能表示を有効化する
 * 実装理由: ドロップ対象であることを明示し操作性を高めるため
 * @param e ドラッグイベント
 */
const onQueryEditorDragEnter = (e: DragEvent) => {
  if (!isFileDragEvent(e)) return;
  queryDragDepth += 1;
  setQueryDropState(true, !hasSupportedSqlFile(e));
};

/**
 * 処理名: クエリエディタドラッグリーブハンドラ
 * 処理概要: ファイルドラッグ離脱時にドロップ可能表示を解除する
 * 実装理由: 子要素をまたぐ dragleave でも表示がちらつかないよう深度管理するため
 * @param e ドラッグイベント
 */
const onQueryEditorDragLeave = (e: DragEvent) => {
  if (!isFileDragEvent(e)) return;
  queryDragDepth = Math.max(0, queryDragDepth - 1);
  if (queryDragDepth === 0) setQueryDropState(false);
};

/**
 * 処理名: クエリエディタドラッグオーバーハンドラ
 * 処理概要: SQLドラッグ中のドロップ可否表示を更新し dropEffect を設定する
 * 実装理由: 利用者に copy/none のフィードバックを即時に返すため
 * @param e ドラッグイベント
 */
const onQueryEditorDragOver = (e: DragEvent) => {
  if (isTreeItemDragEvent(e)) {
    e.stopPropagation(); // Monacoの内部dragoverハンドラに伝播させず、dnd-drag-over状態に入らせない
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    setQueryDropState(false);
    return;
  }
  if (!isFileDragEvent(e)) return;
  const canDrop = hasSupportedSqlFile(e);
  setQueryDropState(true, !canDrop);
  if (e.dataTransfer) e.dataTransfer.dropEffect = canDrop ? 'copy' : 'none';
};

/**
 * 処理名: クエリエディタドロップハンドラ
 * 処理概要: .sql ファイルドロップ時に親コンポーネントへファイル一覧を通知する
 * 実装理由: open-query-button と同等の SQL 読み込みを D&D で可能にするため
 * @param e ドラッグイベント
 */
const onQueryEditorDrop = (e: DragEvent) => {
  if (isTreeItemDragEvent(e)) {
    e.stopPropagation(); // Monacoのdropハンドラに伝播させない
    queryDragDepth = 0;
    setQueryDropState(false);
    const droppedText = getDraggedTreeItemName(e);
    if (!droppedText) return;
    insertTextAtClientPoint(droppedText, e.clientX, e.clientY);
    return;
  }

  queryDragDepth = 0;
  setQueryDropState(false);
  const dropped = Array.from(e.dataTransfer?.files ?? []).filter(f => SQL_FILE_NAME_PATTERN.test(f.name));
  if (dropped.length) emit('drop-query', dropped);
};

// ---- rowSplitter ----
const rowSplitterEl = ref<HTMLElement | null>(null);
const queryEditorEl = ref<HTMLElement | null>(null);
/**
 * 処理名: クエリエディタ要素取得
 * 処理概要: 行スプリッターが参照するクエリエディタ要素を返す
 * 実装理由: 無名関数を避けて可読性と JSDoc 要件を満たすため
 * @returns クエリエディタ要素
 */
const getQueryEditorElement = (): HTMLElement | null => queryEditorEl.value;
useRowSplitter(rowSplitterEl, getQueryEditorElement);

onBeforeUnmount(() => {
  destroyAllTabulatorInstances();
});

defineExpose({
  addQueryTab,
  closeQueryTab,
  getActiveQuery,
  setActiveQuery,
  appendActiveQuery,
  addResultTab,
  clearResultTabs,
  setMessages,
  switchResultTab,
  setResultGridData,
  getCurrentResultData,
  showTableDefinition,
  editTableData,
  formatQuery,
  runFormatMenuAction,
});
</script>
