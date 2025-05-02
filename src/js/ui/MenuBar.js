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

  // 要素を追加
  fileGroup.appendChild(newDbButton);
  fileGroup.appendChild(openDbButton);
  fileGroup.appendChild(saveDbButton);
  queryGroup.appendChild(newQueryButton);
  queryGroup.appendChild(openQueryButton);
  queryGroup.appendChild(saveQueryButton);
  queryGroup.appendChild(runButton);

  menuBar.appendChild(fileGroup);
  menuBar.appendChild(queryGroup);

  return menuBar;
};