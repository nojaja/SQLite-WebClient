import { UI_IDS } from './constants.js';
import { getActiveSqlEditor } from './QueryArea.js';
import { DATASET_DB_ALIAS, listDatasetTables, setEditorQueryForTable } from '../datasetDb.js';

// Sidebar（複数ツリー対応）を作成する関数
export const createSidebar = () => {
  const sidebar = document.createElement('div');
  sidebar.id = UI_IDS.SIDEBAR;
  sidebar.classList.add('sidebar');

  // --- Databasesツリー ---
  const dbTreeBlock = document.createElement('div');
  dbTreeBlock.classList.add('tree-block', 'databases-tree-block');

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
  datasetTreeBlock.classList.add('tree-block', 'dataset-tree-block');

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

// データベースツリービューを更新する関数（スキーマ配列対応）
export const updateDatabaseTree = (schemas) => {
  const treeView = document.getElementById(UI_IDS.DB_TREE);
  const previousOpenState = captureDatabaseOpenState(treeView);
  treeView.innerHTML = '';
  if (!schemas) return;

  // 後方互換: 単一スキーマオブジェクトが渡された場合は配列に変換
  const schemaList = Array.isArray(schemas) ? schemas : [schemas];
  if (schemaList.length === 0) return;

  schemaList.forEach(schema => {
    const alias = schema.alias || 'main';
    const isMain = alias === 'main';
    const isExpanded = previousOpenState.get(alias) ?? false;

    // DB ノードコンテナ
    const dbItem = document.createElement('div');
    dbItem.classList.add('tree-item');

    // DB ノードラベル（折り畳み可能）
    const dbLabel = document.createElement('div');
    dbLabel.classList.add('tree-label', 'db-node');
    dbLabel.dataset.dbAlias = alias;
    dbLabel.style.cursor = 'pointer';
    dbLabel.style.display = 'flex';
    dbLabel.style.alignItems = 'center';
    dbLabel.style.justifyContent = 'space-between';

    const dbLabelLeft = document.createElement('span');
    dbLabelLeft.style.display = 'flex';
    dbLabelLeft.style.alignItems = 'center';
    dbLabelLeft.style.gap = '4px';
    dbLabelLeft.innerHTML = `<span class="material-symbols-outlined toggle-icon">${isExpanded ? 'expand_more' : 'chevron_right'}</span><span class="material-symbols-outlined icon">database</span> ${alias}`;
    dbLabel.appendChild(dbLabelLeft);

    // 全 DB に Detach ボタンを表示（main は空 DB へのリセット）
    {
      const detachBtn = document.createElement('button');
      detachBtn.classList.add('menu-button');
      detachBtn.dataset.detachAlias = alias;
      detachBtn.title = isMain ? 'メインDBをリセット' : `'${alias}' をデタッチ`;
      detachBtn.innerHTML = '<span class="material-symbols-outlined">link_off</span>';
      detachBtn.style.fontSize = '14px';
      dbLabel.appendChild(detachBtn);
    }

    dbItem.appendChild(dbLabel);

    const dbChildren = document.createElement('div');
    dbChildren.classList.add('db-children', 'tree-items');
    dbChildren.style.display = isExpanded ? '' : 'none';

    const tablesGroup = createTreeGroup('Tables', schema.tables || [], 'table', alias);
    const viewsGroup = createTreeGroup('Views', schema.views || [], 'dataset', alias);
    const indexesGroup = createTreeGroup('Indexes', schema.indexes || [], 'table_rows_narrow', alias);
    const triggersGroup = createTreeGroup('Triggers', schema.triggers || [], 'bolt', alias);

    dbChildren.appendChild(tablesGroup);
    dbChildren.appendChild(viewsGroup);
    dbChildren.appendChild(indexesGroup);
    dbChildren.appendChild(triggersGroup);
    dbItem.appendChild(dbChildren);

    // DB ノードの折り畳み（デタッチボタンのクリックは無視）
    dbLabel.addEventListener('click', (e) => {
      if (e.target.closest('[data-detach-alias]')) return;
      const isOpen = dbChildren.style.display !== 'none';
      dbChildren.style.display = isOpen ? 'none' : '';
      dbLabelLeft.querySelector('.toggle-icon').textContent = isOpen ? 'chevron_right' : 'expand_more';
    });

    treeView.appendChild(dbItem);
  });

  // テーブルクリック時のSQLエディタ挿入処理（委任・重複防止）
  if (!treeView._tableClickBound) {
    treeView._tableClickBound = true;
    treeView.addEventListener('click', (e) => {
      const label = e.target.closest('.tree-label.Tables');
      if (!label) return;
      const tableName = label.dataset.name;
      const dbAlias = label.dataset.dbAlias;
      setEditorQueryForTable(getActiveSqlEditor(), tableName, dbAlias || 'main');
    });
  }
};

const captureDatabaseOpenState = (treeView) => {
  const states = new Map();
  if (!treeView) return states;

  treeView.querySelectorAll('.tree-label.db-node').forEach(label => {
    const alias = label.dataset.dbAlias;
    const children = label.parentElement?.querySelector(':scope > .db-children');
    if (!alias || !children) return;
    states.set(alias, children.style.display !== 'none');
  });

  return states;
};

// データセットツリーを更新する関数
export const updateDatasetTree = (db) => {
  const datasetTreeView = document.getElementById('dataset-tree');
  if (!datasetTreeView) return;
  datasetTreeView.innerHTML = '';

  const names = db ? listDatasetTables(db) : [];
  names.forEach(name => {
    const itemElem = document.createElement('div');
    itemElem.classList.add('tree-item');
    const datasetRow = document.createElement('div');
    datasetRow.classList.add('tree-label', 'dataset-node');
    datasetRow.style.display = 'flex';
    datasetRow.style.alignItems = 'center';
    datasetRow.style.justifyContent = 'space-between';

    const datasetLabel = document.createElement('span');
    datasetLabel.classList.add('tree-label', 'dataset');
    datasetLabel.dataset.name = name;
    datasetLabel.dataset.datasetTableName = name;
    datasetLabel.style.display = 'flex';
    datasetLabel.style.alignItems = 'center';
    datasetLabel.style.gap = '4px';
    datasetLabel.innerHTML = `<span class="material-symbols-outlined icon">dataset</span> ${name}`;

    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('menu-button');
    deleteBtn.dataset.deleteDatasetTable = name;
    deleteBtn.title = `データセット「${name}」を削除`;
    deleteBtn.innerHTML = '<span class="material-symbols-outlined">delete</span>';
    deleteBtn.style.fontSize = '14px';

    datasetRow.appendChild(datasetLabel);
    datasetRow.appendChild(deleteBtn);
    itemElem.appendChild(datasetRow);
    datasetTreeView.appendChild(itemElem);
  });
};

// Sidebarのデータセット名クリックでクエリエディタにSQLを挿入
export function setupDatasetTreeClickHandler() {
  const datasetTreeView = document.getElementById('dataset-tree');
  if (!datasetTreeView || datasetTreeView.dataset.clickBound === 'true') return;
  datasetTreeView.dataset.clickBound = 'true';
  datasetTreeView.addEventListener('click', (e) => {
    if (e.target.closest('[data-delete-dataset-table]')) return;
    const label = e.target.closest('[data-dataset-table-name]');
    if (!label) return;
    setEditorQueryForTable(getActiveSqlEditor(), label.dataset.name, DATASET_DB_ALIAS);
  });
}

export function setupDatasetUploadHandler({ db, showSuccess, showError, onDatasetChanged }) {
  const dsUploadBtn = document.getElementById('add-dataset-button');
  if (!dsUploadBtn || dsUploadBtn.dataset.uploadBound === 'true') return;
  dsUploadBtn.dataset.uploadBound = 'true';

  dsUploadBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv';
    input.style.display = 'none';
    document.body.appendChild(input);

    input.addEventListener('change', async () => {
      try {
        const file = input.files && input.files[0];
        if (!file) return;
        const { importCsvFileAsDataset } = await import('../datasetDb.js');
        const tableName = await importCsvFileAsDataset(db, file);
        showSuccess && showSuccess(`データセット「${tableName}」を登録しました`);
        onDatasetChanged && onDatasetChanged();
      } catch (error) {
        showError && showError(error.message || 'CSVの読み込みに失敗しました');
      } finally {
        document.body.removeChild(input);
      }
    }, { once: true });

    input.click();
  });
}

// ツリービューのグループを作成するヘルパー関数
const createTreeGroup = (title, items, iconName, dbAlias = 'main') => {
  const groupContainer = document.createElement('div');
  groupContainer.classList.add('tree-group');

  const groupLabel = document.createElement('div');
  groupLabel.classList.add('tree-label',`${title}-root`);
  // デフォルトは折り畳み(chevron_right)、クリックで展開
  groupLabel.innerHTML = `<span class="material-symbols-outlined toggle-icon">chevron_right</span><span class="material-symbols-outlined icon">${iconName}</span> ${title}`;
  groupContainer.appendChild(groupLabel);

  const itemsContainer = document.createElement('div');
  itemsContainer.classList.add('tree-items');
  // 初期は折り畳み
  itemsContainer.style.display = 'none';

  items.forEach(item => {
    const itemElem = document.createElement('div');
    itemElem.classList.add('tree-item');
    // data-db-alias を埋め込んでクリック時の alias 特定に使う
    itemElem.innerHTML = `<div class="tree-label ${title}" data-name="${item}" data-db-alias="${dbAlias}"><span class="material-symbols-outlined icon">${iconName}</span> ${item}</div>`;
    itemsContainer.appendChild(itemElem);
  });

  groupContainer.appendChild(itemsContainer);
  // クリックでアイテムの表示/非表示をトグルし、アイコン切り替え
  groupLabel.style.cursor = 'pointer';
  groupLabel.addEventListener('click', () => {
    const isCollapsed = itemsContainer.style.display === 'none';
    itemsContainer.style.display = isCollapsed ? '' : 'none';
    groupLabel.querySelector('.toggle-icon').textContent = isCollapsed ? 'expand_more' : 'chevron_right';
  });
  return groupContainer;
};