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
            <div
              v-if="hasResultGridData(tab.resultsId)"
              :id="`tabulator-${tab.resultsId}`"
              class="tabulator-host"
            ></div>
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
import { ref, reactive, computed, nextTick, onBeforeUnmount } from 'vue';
import MonacoEditor from 'monaco-editor-vue3';
import * as monaco from 'monaco-editor';
import { TabulatorFull as Tabulator } from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';
import { useRowSplitter } from '../composables/useRowSplitter';

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
  return columns.map((column) => ({ title: column, field: column }));
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
});
</script>




