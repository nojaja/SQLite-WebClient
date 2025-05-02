import { UI_IDS } from './constants.js'; // Updated import path

// メニューバーを作成する関数
export const createMenuBar = () => {
  const menuBar = document.createElement('div');
  menuBar.id = UI_IDS.MENU_BAR;
  menuBar.classList.add('menu-bar');

  // ファイルメニューグループ
  const fileGroup = document.createElement('div');
  fileGroup.classList.add('menu-group');

  // 新規データベースボタン
  const newDbButton = document.createElement('button');
  newDbButton.id = 'new-db-button';
  newDbButton.classList.add('menu-button');
  newDbButton.innerHTML = '<span class="material-symbols-outlined">database</span> 新規DB';

  // DBを開くボタン
  const openDbButton = document.createElement('button');
  openDbButton.id = 'open-db-button';
  openDbButton.classList.add('menu-button');
  openDbButton.innerHTML = '<span class="material-symbols-outlined">database_upload</span> 開く';

  // 保存ボタン
  const saveDbButton = document.createElement('button');
  saveDbButton.id = 'save-db-button';
  saveDbButton.classList.add('menu-button');
  saveDbButton.innerHTML = '<span class="material-symbols-outlined">save</span> 保存';

  // クエリメニューグループ
  const queryGroup = document.createElement('div');
  queryGroup.classList.add('menu-group');

  // 新規クエリボタン
  const newQueryButton = document.createElement('button');
  newQueryButton.id = 'new-query-button';
  newQueryButton.classList.add('menu-button');
  newQueryButton.innerHTML = '<span class="material-symbols-outlined">post_add</span> 新規Query';

  // クエリを開くボタン
  const openQueryButton = document.createElement('button');
  openQueryButton.id = 'open-query-button';
  openQueryButton.classList.add('menu-button');
  openQueryButton.innerHTML = '<span class="material-symbols-outlined">folder_open</span> Queryを開く';

  // 保存ボタン
  const saveQueryButton = document.createElement('button');
  saveQueryButton.id = 'save-query-button';
  saveQueryButton.classList.add('menu-button');
  saveQueryButton.innerHTML = '<span class="material-symbols-outlined">save</span> Queryを保存';

  // 実行ボタン
  const runButton = document.createElement('button');
  runButton.id = 'run-button';
  runButton.classList.add('menu-button');
  runButton.innerHTML = '<span class="material-symbols-outlined">play_arrow</span> 実行';

  // ヘルプメニューグループ
  const helpGroup = document.createElement('div');
  helpGroup.classList.add('menu-group');

  // ヘルプボタン
  const helpButton = document.createElement('button');
  helpButton.id = 'help-button';
  helpButton.classList.add('menu-button');
  helpButton.innerHTML = '<span class="material-symbols-outlined">help</span> ヘルプ';

  // ヘルプモーダル生成
  const helpModal = document.createElement('div');
  helpModal.id = 'help-modal';
  helpModal.style.display = 'none';
  helpModal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-content">
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
      <button id="close-help-modal">閉じる</button>
    </div>
  `;
  document.body.appendChild(helpModal);

  // ヘルプボタンイベント
  helpButton.addEventListener('click', () => {
    helpModal.style.display = '';
  });
  helpModal.querySelector('#close-help-modal').addEventListener('click', () => {
    helpModal.style.display = 'none';
  });
  helpModal.querySelector('.modal-overlay').addEventListener('click', () => {
    helpModal.style.display = 'none';
  });

  // 要素を追加
  fileGroup.appendChild(newDbButton);
  fileGroup.appendChild(openDbButton);
  fileGroup.appendChild(saveDbButton);
  queryGroup.appendChild(newQueryButton);
  queryGroup.appendChild(openQueryButton);
  queryGroup.appendChild(saveQueryButton);
  queryGroup.appendChild(runButton);
  helpGroup.appendChild(helpButton);

  menuBar.appendChild(fileGroup);
  menuBar.appendChild(queryGroup);
  menuBar.appendChild(helpGroup);
  
  return menuBar;
};