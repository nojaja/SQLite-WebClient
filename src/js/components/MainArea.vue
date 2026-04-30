<template>
  <div id="main-area" class="main-area">
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

    <!-- クエリエリア（タブごと）: id は active タブのみに付与して重複を防ぐ -->
    <div
      v-for="tab in queryTabs"
      :key="tab.id"
      class="query-area"
      :class="{ active: tab.id === activeQueryTabId }"
      :id="`query-area-${tab.id}`"
    >
      <div
        :id="tab.id === activeQueryTabId ? 'query-editor' : undefined"
        class="query-editor"
        :ref="el => trackQueryEditorRef(el, tab.id)"
      >
        <textarea
          :id="tab.id === activeQueryTabId ? 'sql-editor' : undefined"
          placeholder="SQLクエリを入力してください"
          v-model="tab.query"
        ></textarea>
      </div>
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
import { ref, reactive } from 'vue';
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

const switchQueryTab = (id: string) => {
  activeQueryTabId.value = id;
};

const closeQueryTab = (id: string) => {
  const idx = queryTabs.value.findIndex(t => t.id === id);
  if (idx === -1) return;
  queryTabs.value.splice(idx, 1);
  if (activeQueryTabId.value === id) {
    const next = queryTabs.value[Math.max(0, idx - 1)];
    if (next) activeQueryTabId.value = next.id;
  }
};

const addQueryTab = (label = 'Query') => {
  const id = `query${queryTabSerial++}`;
  const num = id.replace('query', '');
  queryTabs.value.push({ id, label: `${label}${num}`, query: '' });
  activeQueryTabId.value = id;
};

/** アクティブタブのクエリ文字列を取得 */
const getActiveQuery = (): string => {
  return queryTabs.value.find(t => t.id === activeQueryTabId.value)?.query ?? '';
};

/** アクティブタブのクエリを設定 */
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

const hasResultGridData = (tableId: string): boolean => resultGridData.has(tableId);
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

const removeResultTab = (id: string) => {
  const tab = resultTabs.value.find(t => t.id === id);
  if (!tab) return;
  resultGridData.delete(tab.resultsId);
  const idx = resultTabs.value.findIndex(t => t.id === id);
  resultTabs.value.splice(idx, 1);
  const remaining = resultTabs.value.filter(t => t.closable);
  switchResultTab(remaining.length > 0 ? remaining[0].id : 'messages-tab');
};

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

const setMessages = (msg: string | string[]) => {
  messages.value = Array.isArray(msg) ? msg : [msg];
};

// ---- 結果グリッドデータ管理 ----
/** 指定タブに結果データをセット（DataTable コンポーネントが自動描画） */
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

/** アクティブな結果タブのデータを返す（CSVダウンロード・データセット登録に使用） */
const getCurrentResultData = (): ResultData | null => {
  const activeTab = resultTabs.value.find(t => t.id === activeResultTabId.value && t.closable);
  if (!activeTab) return null;
  return resultGridData.get(activeTab.resultsId) ?? null;
};

// ---- rowSplitter ----
const rowSplitterEl = ref<HTMLElement | null>(null);
/** タブIDごとにquery-editor要素を保持（rowSplitterへ渡す） */
const queryEditorRefs = new Map<string, HTMLElement>();
const trackQueryEditorRef = (el: unknown, tabId: string) => {
  if (el instanceof HTMLElement) queryEditorRefs.set(tabId, el);
  else queryEditorRefs.delete(tabId);
};
useRowSplitter(rowSplitterEl, () => queryEditorRefs.get(activeQueryTabId.value) ?? null);

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
