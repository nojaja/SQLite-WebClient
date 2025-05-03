import { UI_IDS } from './constants.js'; // Updated import path

// Sidebar（複数ツリー対応）を作成する関数
export const createSidebar = () => {
  const sidebar = document.createElement('div');
  sidebar.id = UI_IDS.SIDEBAR;
  sidebar.classList.add('sidebar');

  // --- Databasesツリー ---
  const dbTreeBlock = document.createElement('div');
  dbTreeBlock.classList.add('tree-block');

  const dbTreeTitle = document.createElement('div');
  dbTreeTitle.classList.add('tree-title');
  // アイコン追加
  const dbIcon = document.createElement('span');
  dbIcon.classList.add('material-symbols-outlined', 'tree-toggle-icon');
  dbIcon.textContent = 'expand_more';
  dbTreeTitle.appendChild(dbIcon);
  dbTreeTitle.append('Databases');

  // 更新ボタン
  const refreshButton = document.createElement('button');
  refreshButton.id = 'refresh-db-button';
  refreshButton.classList.add('menu-button');
  refreshButton.innerHTML = '<span class="material-symbols-outlined">refresh</span>';
  dbTreeTitle.appendChild(refreshButton);
  dbTreeBlock.appendChild(dbTreeTitle);

  const dbTreeView = document.createElement('div');
  dbTreeView.id = UI_IDS.DB_TREE;
  dbTreeView.classList.add('tree-view');
  dbTreeBlock.appendChild(dbTreeView);

  // アコーディオン動作
  dbTreeTitle.style.cursor = 'pointer';
  dbTreeTitle.addEventListener('click', (e) => {
    // 更新ボタン押下時は無視
    if (e.target === refreshButton || refreshButton.contains(e.target)) return;
    const isOpen = dbTreeView.style.display !== 'none';
    dbTreeView.style.display = isOpen ? 'none' : '';
    dbIcon.textContent = isOpen ? 'chevron_right' : 'expand_more';
  });
  // 初期状態は展開
  dbTreeView.style.display = '';
  dbIcon.textContent = 'expand_more';

  sidebar.appendChild(dbTreeBlock);

  // --- データセットツリー ---
  const datasetTreeBlock = document.createElement('div');
  datasetTreeBlock.classList.add('tree-block');

  const datasetTreeTitle = document.createElement('div');
  datasetTreeTitle.classList.add('tree-title');
  // アイコン追加
  const dsIcon = document.createElement('span');
  dsIcon.classList.add('material-symbols-outlined', 'tree-toggle-icon');
  dsIcon.textContent = 'expand_more';
  datasetTreeTitle.appendChild(dsIcon);
  datasetTreeTitle.append('データセット');

  // upload_fileアイコン追加ボタン
  const dsUploadBtn = document.createElement('button');
  dsUploadBtn.id = 'add-dataset-button';
  dsUploadBtn.classList.add('menu-button');
  dsUploadBtn.title = 'データセット追加';
  dsUploadBtn.innerHTML = '<span class="material-symbols-outlined">upload_file</span>';
  datasetTreeTitle.appendChild(dsUploadBtn);

  // 追加ボタンのCSV読み込み機能をここでバインド
  dsUploadBtn.addEventListener('click', async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', async (e) => {
      const file = input.files && input.files[0];
      if (!file) return;
      const text = await file.text();
      try {
        const parse = (await import('csv-parse/browser/esm')).parse;
        parse(text, { columns: true, skip_empty_lines: true }, (err, output) => {
          if (err) {
            alert('CSVの読み込みに失敗しました');
            return;
          }
          if (!output.length) {
            alert('CSVにデータがありません');
            return;
          }
          const columns = Object.keys(output[0]);
          const rows = output;
          const name = prompt('データセット名を入力してください', file.name.replace(/\.csv$/i, ''));
          if (!name) return;
          window.__DATASET_STORE__[name] = { columns, rows };
          alert(`データセット「${name}」を登録しました`);
          if (typeof updateDatasetTree === 'function') updateDatasetTree();
        });
      } catch (e) {
        alert('csv-parseの読み込みに失敗しました');
      }
      document.body.removeChild(input);
    });
    input.click();
  });

  datasetTreeBlock.appendChild(datasetTreeTitle);

  const datasetTreeView = document.createElement('div');
  datasetTreeView.id = 'dataset-tree';
  datasetTreeView.classList.add('tree-view');
  datasetTreeBlock.appendChild(datasetTreeView);

  // アコーディオン動作
  datasetTreeTitle.style.cursor = 'pointer';
  datasetTreeTitle.addEventListener('click', (e) => {
    // 追加ボタン押下時は無視
    if (e.target === dsUploadBtn || dsUploadBtn.contains(e.target)) return;
    const isOpen = datasetTreeView.style.display !== 'none';
    datasetTreeView.style.display = isOpen ? 'none' : '';
    dsIcon.textContent = isOpen ? 'chevron_right' : 'expand_more';
  });
  // 初期状態は展開
  datasetTreeView.style.display = '';
  dsIcon.textContent = 'expand_more';

  sidebar.appendChild(datasetTreeBlock);

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

  // テーブルクリック時のSQLエディタ挿入処理（アクティブなquery-areaのエディタにセット）
  treeView.addEventListener('click', (e) => {
    const label = e.target.closest('.tree-label.table');
    if (!label) return;
    const tableName = label.dataset.name;
    // アクティブなquery-area内のsql-editorを取得
    const activeQueryArea = document.querySelector('.query-area.active');
    const editor = activeQueryArea && activeQueryArea.querySelector('textarea#sql-editor');
    if (editor) {
      editor.value = `SELECT * FROM ${tableName} LIMIT 100`;
      editor.focus();
    }
  });
};

// データセットツリーを更新する関数
export const updateDatasetTree = () => {
  const datasetTreeView = document.getElementById('dataset-tree');
  if (!datasetTreeView) return;
  datasetTreeView.innerHTML = '';
  const store = window.__DATASET_STORE__ || {};
  const names = Object.keys(store);
  names.forEach(name => {
    const itemElem = document.createElement('div');
    itemElem.classList.add('tree-item');
    itemElem.innerHTML = `<div class="tree-label dataset" data-name="${name}"><span class="material-symbols-outlined icon">dataset</span> ${name}</div>`;
    datasetTreeView.appendChild(itemElem);
  });

  // --- 参照データプルダウンも全タブ分更新 ---
  const selects = document.querySelectorAll('.ref-dataset-select');
  selects.forEach(select => {
    const current = select.value;
    // 一旦全option削除
    while (select.firstChild) select.removeChild(select.firstChild);
    // なし
    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = 'なし';
    select.appendChild(noneOpt);
    // データセット名
    const dsStore = window.__DATASET_STORE__ || {};
    Object.keys(dsStore).forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
    // 可能なら元の選択値を復元
    select.value = current;
    if (!select.value) select.value = '';
  });
};

// Sidebarのデータセット名クリックでResultsタブ追加＆内容復元
export function setupDatasetTreeClickHandler() {
  const datasetTreeView = document.getElementById('dataset-tree');
  if (!datasetTreeView) return;
  datasetTreeView.addEventListener('click', (e) => {
    const label = e.target.closest('.tree-label.dataset');
    if (!label) return;
    const name = label.dataset.name;
    const store = window.__DATASET_STORE__ || {};
    const dataset = store[name];
    if (!dataset) return;
    // Resultsタブ・テーブル追加
    const tabs = document.querySelector('.results-tabs');
    const resultsGrid = document.getElementById('results-grid');
    if (!tabs || !resultsGrid) return;
    // 既に同名タブがあればアクティブ化のみ
    let resTab = Array.from(tabs.querySelectorAll('.result-tab')).find(t => t.textContent === name);
    if (!resTab) {
      // タブ追加
      resTab = document.createElement('div');
      resTab.classList.add('result-tab');
      resTab.textContent = name;
      resTab.dataset.resultsId = `results-table-dataset-${name}`;
      const msgTab = tabs.querySelector('.result-tab:last-child');
      tabs.insertBefore(resTab, msgTab);
      // テーブル追加
      const table = document.createElement('table');
      table.id = resTab.dataset.resultsId;
      table.classList.add('display', 'dataTable');
      // thead
      const thead = document.createElement('thead');
      const tr = document.createElement('tr');
      dataset.columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        tr.appendChild(th);
      });
      thead.appendChild(tr);
      table.appendChild(thead);
      // tbody
      const tbody = document.createElement('tbody');
      dataset.rows.forEach(row => {
        const tr = document.createElement('tr');
        dataset.columns.forEach(col => {
          const td = document.createElement('td');
          td.textContent = row[col] != null ? row[col] : '';
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      table.style.display = 'none';
      resultsGrid.appendChild(table);
    }
    // タブ切り替え
    tabs.querySelectorAll('.result-tab').forEach(t => t.classList.remove('active'));
    resTab.classList.add('active');
    // テーブル表示切替
    Array.from(resultsGrid.children).forEach(tbl => {
      tbl.style.display = (tbl.id === resTab.dataset.resultsId) ? '' : 'none';
    });
    // Resultsグリッド表示、Messages非表示
    resultsGrid.style.display = '';
    const messagesArea = document.getElementById('messages-area');
    if (messagesArea) messagesArea.style.display = 'none';
    // メニューバー表示
    const resultsMenuBar = document.querySelector('.results-menu-bar');
    if (resultsMenuBar) resultsMenuBar.style.display = 'flex';
  });
}

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