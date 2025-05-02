// SQLite Sample - SQLクライアントアプリケーション
import $ from 'jquery';
import '../css/app.css';
// DataTablesのスタイルをバンドル（app.cssの後に読み込む）
import 'datatables.net-dt/css/dataTables.dataTables.min.css';
import 'datatables.net-fixedheader-dt/css/fixedHeader.dataTables.min.css';
import { createUI } from './ui.js';
import { setupEventHandlers } from './events.js';
import SQLiteManager from './SQLiteManager.js';
import TabManager from './tabManager.js';
import { setupResultsMessagesToggle } from './ui/ImagesNotExists.js'; // Import added

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

  // 即時バインド: 新規Queryボタンでタブ追加
  const newQueryBtn = document.getElementById('new-query-button');
  if (newQueryBtn) {
    newQueryBtn.addEventListener('click', () => tabManager.addTab('Query'));
  }
  // 即時バインド: Results/Messagesタブ切り替え
  setupResultsMessagesToggle(); // Replaced the event listener block with this function call

  // データベース機能を SQLiteManager でセットアップ (print, printErr を指定)
  const db = await SQLiteManager.initialize(null, { print: console.log, printErr: console.error });
  // ブラウザ環境ではイベントハンドラと初期DB表示をセットアップ
  setupEventHandlers(ui, db, tabManager);
  db.executeQuery(`CREATE TABLE IF NOT EXISTS test (col1 INTEGER PRIMARY KEY, col2 TEXT)`);
  db.executeQuery(`INSERT OR IGNORE INTO test (col1, col2) VALUES (1, '111')`);
  db.executeQuery(`INSERT OR IGNORE INTO test (col1, col2) VALUES (2, '222')`);
  // スキーマ取得とツリービュー更新
  const schema = db.getDatabaseSchema();
  ui.updateDatabaseTree(schema);

  console.log('SQLite Sampleの起動が完了しました！');
};

// アプリケーションを実行
(async () => {
  await main();
})();