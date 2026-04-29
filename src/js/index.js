// SQLite Sample - SQLクライアントアプリケーション
import $ from 'jquery';
import '../css/app.css';
// DataTablesのスタイルをバンドル（app.cssの後に読み込む）
import 'datatables.net-dt/css/dataTables.dataTables.min.css';
import 'datatables.net-fixedheader-dt/css/fixedHeader.dataTables.min.css';
import { createUI } from './ui.js';
import SQLiteManager from './SQLiteManager.js';
import TabManager from './tabManager.js';
import { setupEventHandlers } from './events.js';

// DataTablesプラグインの初期化
window.$ = window.jQuery = $;
console.log('ブラウザ環境でDataTablesを初期化しました');

// アプリケーションのメインエントリポイント
const main = async () => {
  console.log('SQLite Sampleアプリケーションを起動中...');
  // ブラウザ環境でのみUIを先行して初期化
  let ui = null;
  let tabManager = null;
  ui = createUI();
  tabManager = new TabManager({
    containerId: 'query-tabs',
    editorId: 'sql-editor',
    resultsId: 'results-grid',
    messagesId: 'messages-area'
  });
  window.tabManager = tabManager;

  // 即時バインド: 新規Queryボタンでタブ追加
  const newQueryBtn = document.getElementById('new-query-button');
  if (newQueryBtn) {
    newQueryBtn.addEventListener('click', () => {
      const mainArea = document.getElementById('main-area');
      if (mainArea && mainArea.style.display === 'none') {
        mainArea.style.display = '';
      }
      tabManager.addTab('Query');
    });
  }

  // データベース機能を SQLiteManager でセットアップ (print, printErr を指定)
  const db = await SQLiteManager.initialize(null, { print: console.log, printErr: console.error });
  // ブラウザ環境ではイベントハンドラと初期DB表示をセットアップ
  setupEventHandlers(ui, db, tabManager);
  // 起動直後はツリーを空のまま（サンプルデータを表示しない）

  console.log('SQLite Sampleの起動が完了しました！');
};

// アプリケーションを実行
(async () => {
  await main();
})();