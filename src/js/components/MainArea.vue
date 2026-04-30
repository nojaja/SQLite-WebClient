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
    <div id="query-editor" class="query-editor" ref="queryEditorEl">
      <MonacoEditor
        id="sql-editor"
        :value="activeTabQuery"
        @change="updateActiveTabQuery"
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
      </div>

      <!-- 結果エリア -->
      <div id="results-area" class="results-area" :style="{ display: showResultsArea ? '' : 'none' }">
        <div id="results-grid" class="results-grid">
          <div
            v-for="tab in resultTabs.filter(t => t.closable)"
            :key="tab.resultsId"
            :id="tab.resultsId"
            v-show="activeResultTabId === tab.id"
          >
            <DataTable
              v-if="hasResultGridData(tab.resultsId)"
              :key="`${tab.resultsId}-${getResultGridData(tab.resultsId)?.renderKey ?? 0}`"
              :data="getResultGridData(tab.resultsId)?.data ?? []"
              :columns="(getResultGridData(tab.resultsId)?.columns ?? []).map(col => ({ data: col, title: col }))"
              :options="dtOptions"
              class="display"
            />
          </div>
        </div>
        <div v-show="showResultsMenuBar" class="results-menu-bar">
          <button id="register-dataset-btn" class="menu-button" @click="$emit('register-dataset')">
            <span class="material-symbols-outlined">playlist_add</span> Register as Dataset
          </button>
          <button id="csv-download-button" class="menu-button" @click="$emit('download-csv')">
            <span class="material-symbols-outlined">download</span> Download CSV
          </button>
        </div>
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
import { ref, reactive, computed } from 'vue';
import MonacoEditor from 'monaco-editor-vue3';
import DataTable from 'datatables.net-vue3';
import DataTablesCore from 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.min.css';
import 'datatables.net-fixedheader-dt';
import 'datatables.net-fixedheader-dt/css/fixedHeader.dataTables.min.css';
import { useRowSplitter } from '../composables/useRowSplitter';

DataTable.use(DataTablesCore);

defineEmits<{
  'register-dataset': [];
  'download-csv': [];
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

/** Monacoエディタの設定オプション */
const monacoOptions = {
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  wordWrap: 'on' as const,
  fontSize: 14,
  lineNumbers: 'on' as const,
  automaticLayout: true,
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
 * 処理概要: 指定 ID のクエリタブを削除し、必要に応じて隔隣タブにフォーカスを移す
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

// ---- 結果タブ ----
interface ResultData {
  columns: string[];
  data: Record<string, unknown>[];
  renderKey: number;
}

const resultGridData = reactive<Map<string, ResultData>>(new Map());

const dtOptions = {
  paging: true,
  searching: false,
  info: false,
  fixedHeader: false,
  layout: { topStart: null, topEnd: null },
};

let dataTableRenderSerial = 0;

/**
 * 処理名: 結果データ存在確認
 * 処理概要: 指定タブ ID に結果データが存在するか確認する
 * 実装理由: DataTable 描画前にデータの有無を判定するため
 * @param tableId 結果テーブル ID
 * @returns データが存在する場合 true
 */
const hasResultGridData = (tableId: string): boolean => resultGridData.has(tableId);
/**
 * 処理名: 結果データ取得
 * 処理概要: 指定タブ ID の結果データを返す
 * 実装理由: DataTable コンポーネントにデータを渡すため
 * @param tableId 結果テーブル ID
 * @returns 結果データオブジェクトまたは undefined
 */
const getResultGridData = (tableId: string): ResultData | undefined => resultGridData.get(tableId);

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
  resultTabs.value.filter(t => t.closable).forEach(t => resultGridData.delete(t.resultsId));
  resultTabs.value = resultTabs.value.filter(t => t.id === 'messages-tab');
  showResultsArea.value = false;
  showMessagesArea.value = true;
  showResultsMenuBar.value = false;
  activeResultTabId.value = 'messages-tab';
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
 * 処理概要: 指定タブに結果データをセットし DataTable コンポーネントが自動描画する
 * 実装理由: クエリ結果をテーブルで表示するため DataTable にデータを渡す必要がある
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

  const nextRenderKey = ++dataTableRenderSerial;
  resultGridData.set(tableId, { columns, data: normalizedRows, renderKey: nextRenderKey });
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

// ---- rowSplitter ----
const rowSplitterEl = ref<HTMLElement | null>(null);
const queryEditorEl = ref<HTMLElement | null>(null);
useRowSplitter(rowSplitterEl, () => queryEditorEl.value);

defineExpose({
  addQueryTab,
  closeQueryTab,
  getActiveQuery,
  setActiveQuery,
  addResultTab,
  clearResultTabs,
  setMessages,
  switchResultTab,
  setResultGridData,
  getCurrentResultData,
});
</script>
