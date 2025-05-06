import { createMenuBarView } from './MenuBarView.js';
import { setupMenuBarController } from './MenuBarController.js';
import { createModal } from './Modal.js';

// メニューバーを作成する関数
export const createMenuBar = () => {

  const menuBar = createMenuBarView();
  // ファイルメニューグループ
  const fileGroup = menuBar.addMenuGroup('file-group');
  fileGroup.addMenuItem('new-db-button', 'database', '新規DB');// 新規データベースボタン
  fileGroup.addMenuItem('open-db-button', 'database_upload', '開く');// DBを開くボタン
  fileGroup.addMenuItem('save-db-button', 'save', '保存');// 保存ボタン

  // クエリメニューグループ
  const queryGroup = menuBar.addMenuGroup('query-group');
  queryGroup.addMenuItem('new-query-button', 'post_add', '新規Query');// 新規クエリボタン
  queryGroup.addMenuItem('open-query-button', 'folder_open', 'Queryを開く');// クエリを開くボタン
  queryGroup.addMenuItem('save-query-button', 'save', 'Queryを保存');// 保存ボタン
  queryGroup.addMenuItem('run-button', 'play_arrow', '実行');// 実行ボタン

  // helpModalをModal.jsで生成
  const helpModal = createModal({
    id: 'help-modal',
    contentHtml: `
      <h2>ヘルプ・ライセンス情報</h2>
      <ul>
        <li><a href="https://github.com/nojaja/SQLite-WebClient" target="_blank">GitHubリポジトリ</a></li>
      </ul>
      <h3>使用ライブラリとライセンス</h3>
      <ul>
        <li><a href="https://www.npmjs.com/package/@sqlite.org/sqlite-wasm" target="_blank">@sqlite.org/sqlite-wasm</a> (Apache-2.0)</li>
        <li><a href="https://www.npmjs.com/package/jquery" target="_blank">jQuery</a> (MIT)</li>
        <li><a href="https://www.npmjs.com/package/datatables.net-dt" target="_blank">DataTables</a> (MIT)</li>
        <li><a href="https://www.npmjs.com/package/dbgate-query-splitter" target="_blank">dbgate-query-splitter</a> (MIT)</li>
      </ul>
    `
  });

  // ヘルプメニューグループ
  const helpGroup = menuBar.addMenuGroup('help-group');
  helpGroup.addMenuItem('help-button', 'help', 'ヘルプ', () => helpModal.showModal());// ヘルプボタン


  return menuBar;
};

export { createMenuBarView, setupMenuBarController };