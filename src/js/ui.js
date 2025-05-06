// ui.js - UIコンポーネントを作成するモジュール
import { updateResultsGrid } from './ui/Results';
//import { showError, showSuccess } from './ui/Messages';
// Sidebar機能を外部モジュールからインポート
import { createSidebar, updateDatabaseTree, setupDatasetTreeClickHandler } from './ui/Sidebar';
// MenuBar機能を外部モジュールからインポート
import { createMenuBar } from './ui/MenuBar';
import { createStatusBar, showError, showSuccess } from './ui/StatusBar';
import { UI_IDS } from './ui/constants.js'; // Import UI_IDS from the new file
import { createSplitter } from './ui/splitter.js'; // Import createSplitter
import { createMainArea } from './ui/MainArea.js';

// UIを作成する関数
export const createUI = () => {
  // 重複呼び出し対策: 既にUIが生成済みなら再生成しない
  if (document.getElementById(UI_IDS.APP_CONTAINER)) {
    return {
      getElement: id => document.getElementById(id),
      updateResultsGrid: (data) => updateResultsGrid(data, document.getElementById(UI_IDS.RESULTS_GRID)),
      updateDatabaseTree,
      showError,
      showSuccess
    };
  }
  // HTMLのbody要素を取得
  const body = document.querySelector('body');

  // メインコンテナを作成
  const appContainer = document.createElement('div');
  appContainer.id = UI_IDS.APP_CONTAINER;
  appContainer.classList.add('app-container');

  // メニューバーを作成
  const menuBar = createMenuBar();

  // メインエリアのレイアウト（サイドバーとコンテンツエリア）を作成
  const mainLayout = document.createElement('div');
  mainLayout.classList.add('main-layout');

  const sidebar = createSidebar();
  const mainArea = createMainArea();

  // サイドバーとメインエリアの間にドラッグ可能なスプリッターを追加
  // splitterの作成ロジックを外部モジュール呼び出しに変更
  const splitter = createSplitter(sidebar);

  // レイアウト要素に順番に追加
  mainLayout.appendChild(sidebar);
  mainLayout.appendChild(splitter);
  mainLayout.appendChild(mainArea);
  // Sidebarのデータセット名クリックハンドラをバインド
  setTimeout(() => setupDatasetTreeClickHandler(), 0);

  // ステータスバーを作成
  const statusBar = createStatusBar();

  // 要素を追加
  appContainer.appendChild(menuBar);
  appContainer.appendChild(mainLayout);
  appContainer.appendChild(statusBar);
  body.appendChild(appContainer);

  // オブジェクトを返す
  return {
    getElement: (id) => document.getElementById(id),
    updateResultsGrid: (data) => updateResultsGrid(data, document.getElementById(UI_IDS.RESULTS_GRID)),
    updateDatabaseTree: (schema) => updateDatabaseTree(schema),
    showError: (message) => showError(message),
    showSuccess: (message) => showSuccess(message)
  };
};

// local updateResultsGrid implementation removed; using external Results module