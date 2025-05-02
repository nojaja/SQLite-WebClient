import { UI_IDS } from './constants.js'; // Updated import path

// サイドバー（データベースツリービュー）を作成する関数
export const createSidebar = () => {
  const sidebar = document.createElement('div');
  sidebar.id = UI_IDS.SIDEBAR;
  sidebar.classList.add('sidebar');

  const treeTitle = document.createElement('div');
  treeTitle.classList.add('tree-title');
  treeTitle.textContent = 'Databases';

  // 更新ボタン
  const refreshButton = document.createElement('button');
  refreshButton.id = 'refresh-db-button';
  refreshButton.classList.add('menu-button');
  refreshButton.innerHTML = '<span class="material-symbols-outlined">refresh</span>'; // アイコン変更
  treeTitle.appendChild(refreshButton);
  sidebar.appendChild(treeTitle);

  const treeView = document.createElement('div');
  treeView.id = UI_IDS.DB_TREE;
  treeView.classList.add('tree-view');
  sidebar.appendChild(treeView);

  return sidebar;
};

// データベースツリービューを更新する関数
export const updateDatabaseTree = (schema) => {
  const treeView = document.getElementById(UI_IDS.DB_TREE);
  treeView.innerHTML = '';
  if (!schema) return;

  const dbItem = document.createElement('div');
  dbItem.classList.add('tree-item', 'expanded');

  // Databaseは一つだけなので、この階層は省略
  // const dbLabel = document.createElement('div');
  // dbLabel.classList.add('tree-label');
  // // デフォルトは折り畳み(⊞)、クリックで展開
  // dbLabel.innerHTML = `<i class="toggle-icon">⊞</i><i class="icon">📂</i> Untitled.db`;
  // // クリックでグループ表示のトグル
  // dbLabel.style.cursor = 'pointer';
  // dbLabel.addEventListener('click', () => {
  //   const children = Array.from(dbItem.children).slice(1);
  //   children.forEach(node => node.style.display = node.style.display === 'none' ? '' : 'none');
  //   // トグルアイコンを更新
  //   const isCollapsed = children[0].style.display === 'none';
  //   dbLabel.querySelector('.toggle-icon').textContent = isCollapsed ? '⊞' : '⊟';
  // });
  // dbItem.appendChild(dbLabel);

  const tablesGroup = createTreeGroup('Tables', schema.tables || [], 'table'); // アイコン名変更
  const viewsGroup = createTreeGroup('Views', schema.views || [], 'dataset'); // アイコン名変更
  const indexesGroup = createTreeGroup('Indexes', schema.indexes || [], 'table_rows_narrow'); // アイコン名変更
  const triggersGroup = createTreeGroup('Triggers', schema.triggers || [], 'bolt'); // アイコン名変更

  // テストで要素を可視にするため、全グループを初期展開
  [tablesGroup, viewsGroup, indexesGroup, triggersGroup].forEach(group => {
    const items = group.querySelector('.tree-items');
    items.style.display = '';
    group.querySelector('.toggle-icon').textContent = 'expand_more'; // アイコン変更
  });

  dbItem.appendChild(tablesGroup);
  dbItem.appendChild(viewsGroup);
  dbItem.appendChild(indexesGroup);
  dbItem.appendChild(triggersGroup);

  treeView.appendChild(dbItem);
};

// ツリービューのグループを作成するヘルパー関数
const createTreeGroup = (title, items, iconName) => { // 引数名を icon -> iconName に変更
  const groupContainer = document.createElement('div');
  groupContainer.classList.add('tree-group');

  const groupLabel = document.createElement('div');
  groupLabel.classList.add('tree-label',`${title}-root`);
  // デフォルトは折り畳み(chevron_right)、クリックで展開
  groupLabel.innerHTML = `<span class="material-symbols-outlined toggle-icon">chevron_right</span><span class="material-symbols-outlined icon">${iconName}</span> ${title}`; // アイコン変更
  groupContainer.appendChild(groupLabel);

  const itemsContainer = document.createElement('div');
  itemsContainer.classList.add('tree-items');
  // 初期は折り畳み
  itemsContainer.style.display = 'none';

  items.forEach(item => {
    const itemElem = document.createElement('div');
    itemElem.classList.add('tree-item');
    itemElem.innerHTML = `<div class=\"tree-label ${title}\" data-name=\"${item}\"><span class=\"material-symbols-outlined icon\">${iconName}</span> ${item}</div>`; // アイコン変更
    itemsContainer.appendChild(itemElem);
  });

  groupContainer.appendChild(itemsContainer);
  // クリックでアイテムの表示/非表示をトグルし、アイコン切り替え
  groupLabel.style.cursor = 'pointer';
  groupLabel.addEventListener('click', () => {
    const isCollapsed = itemsContainer.style.display === 'none';
    itemsContainer.style.display = isCollapsed ? '' : 'none';
    groupLabel.querySelector('.toggle-icon').textContent = isCollapsed ? 'expand_more' : 'chevron_right'; // アイコン変更
  });
  return groupContainer;
};