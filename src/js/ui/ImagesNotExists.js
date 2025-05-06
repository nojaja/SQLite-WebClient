import { UI_IDS } from './constants.js';
import { updateDatasetTree } from './Sidebar.js';

// データセットストア（グローバル）
window.__DATASET_STORE__ = window.__DATASET_STORE__ || {};

// Results と Messages のセクションを作成
export const createResultsSection = () => {
  // メニューバー追加
  const resultsMenuBar = document.createElement('div');
  resultsMenuBar.classList.add('results-menu-bar');

  // データセットに登録ボタン
  const registerDatasetBtn = document.createElement('button');
  registerDatasetBtn.id = 'register-dataset-btn';
  registerDatasetBtn.classList.add('menu-button');
  registerDatasetBtn.innerHTML = '<span class="material-symbols-outlined">playlist_add</span> データセットに登録';
  resultsMenuBar.appendChild(registerDatasetBtn);

  // CSVダウンロードボタン
  const csvDownloadButton = document.createElement('button');
  csvDownloadButton.id = 'csv-download-button';
  csvDownloadButton.classList.add('menu-button');
  csvDownloadButton.innerHTML = '<span class="material-symbols-outlined">download</span> CSVダウンロード';
  resultsMenuBar.appendChild(csvDownloadButton);

  // CSVダウンロード処理
  csvDownloadButton.addEventListener('click', async () => {
    const { getCurrentResults } = await import('./Results.js');
    const results = getCurrentResults ? getCurrentResults() : null;
    if (!results || !Array.isArray(results.rows) || !Array.isArray(results.columns)) {
      alert('ダウンロード可能なデータがありません');
      return;
    }
    const stringify = (await import('csv-stringify/browser/esm')).stringify;
    stringify([results.columns, ...results.rows], (err, output) => {
      if (err) {
        alert('CSV変換に失敗しました');
        return;
      }
      const blob = new Blob([output], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'results.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  });

  // Results/Messagesタブ
  const resultsTabs = document.createElement('div');
  resultsTabs.classList.add('results-tabs');
  // 初期はMessagesタブのみ
  const msgTab = document.createElement('div');
  msgTab.classList.add('result-tab', 'active');
  msgTab.textContent = 'Messages';
  resultsTabs.appendChild(msgTab);

  // グリッドエリア
  const resultsGrid = document.createElement('div');
  resultsGrid.id = UI_IDS.RESULTS_GRID;
  resultsGrid.classList.add('results-grid');
  // 初期はテーブルを生成しない

  // results-areaでラップ
  const resultsArea = document.createElement('div');
  resultsArea.id = UI_IDS.RESULTS_AREA;
  resultsArea.classList.add('results-area');
  resultsArea.appendChild(resultsGrid);
  resultsArea.appendChild(resultsMenuBar);

  const messagesArea = document.createElement('div');
  messagesArea.id = 'messages-area';
  messagesArea.classList.add('messages-area');
  messagesArea.style.display = '';

  // resultsArea, resultsTabs, messagesAreaを返す
  return { resultsArea, resultsTabs, messagesArea };
};

// 複数Resultsタブ・テーブル追加用
export const addResults = (label, tableId = null) => {
  const tabs = document.querySelector('.results-tabs');
  const resultsGrid = document.getElementById(UI_IDS.RESULTS_GRID);
  if (!tabs || !resultsGrid) return null;

  // タブ作成
  const resTab = document.createElement('div');
  resTab.classList.add('result-tab');
  resTab.textContent = label;
  resTab.dataset.resultsId = tableId || `results-table-${label}`;
  // closeボタン追加
  const close = document.createElement('span');
  close.classList.add('close-tab');
  close.textContent = '×';
  close.addEventListener('click', e => {
    e.stopPropagation();
    // タブ削除前に親を保持
    const tabs = resTab.parentElement;
    resTab.remove();
    if (!tabs) return;
    // テーブル削除
    const tbl = document.getElementById(resTab.dataset.resultsId);
    if (tbl) tbl.remove();
    // 他のタブをアクティブ化（なければMessages）
    const remainTabs = Array.from(tabs.querySelectorAll('.result-tab')).filter(t => t !== resTab && t.textContent !== 'Messages');
    if (remainTabs.length > 0) {
      remainTabs[0].classList.add('active');
      const resultsGrid = document.getElementById(UI_IDS.RESULTS_GRID);
      if (resultsGrid) {
        Array.from(resultsGrid.children).forEach(tbl => {
          tbl.style.display = (tbl.id === remainTabs[0].dataset.resultsId) ? '' : 'none';
        });
      }
      // Resultsエリア表示
      const resultsArea = document.getElementById(UI_IDS.RESULTS_AREA);
      const messagesArea = document.getElementById('messages-area');
      if (resultsArea) resultsArea.style.display = '';
      if (messagesArea) messagesArea.style.display = 'none';
    } else {
      // Messagesタブをアクティブ
      const msgTab = tabs.querySelector('.result-tab:last-child');
      if (msgTab) msgTab.classList.add('active');
      const resultsArea = document.getElementById(UI_IDS.RESULTS_AREA);
      const messagesArea = document.getElementById('messages-area');
      if (resultsArea) resultsArea.style.display = 'none';
      if (messagesArea) messagesArea.style.display = '';
    }
  });
  resTab.appendChild(close);
  // Messagesタブの直前に挿入
  const msgTab = tabs.querySelector('.result-tab:last-child');
  tabs.insertBefore(resTab, msgTab);

  // テーブル作成
  const resultsTable = document.createElement('table');
  resultsTable.id = resTab.dataset.resultsId;
  resultsTable.classList.add('display', 'dataTable');
  resultsTable.style.display = 'none';
  const emptyTbody = document.createElement('tbody');
  resultsTable.appendChild(emptyTbody);
  resultsGrid.appendChild(resultsTable);

  // 最初の追加時はactiveに
  if (tabs.querySelectorAll('.result-tab').length === 3) {
    tabs.querySelectorAll('.result-tab').forEach(t => t.classList.remove('active'));
    resTab.classList.add('active');
    Array.from(resultsGrid.children).forEach(tbl => tbl.style.display = 'none');
    resultsTable.style.display = '';
  }
  return resultsTable;
};

// Results/Messages タブ切り替えのイベントをセットアップ
export const setupResultsMessagesToggle = () => {
  const tabs = document.querySelector('.results-tabs');
  const resultsMenuBar = document.querySelector('.results-menu-bar');
  if (!tabs) return;
  tabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.result-tab');
    if (!tab) return;
    tabs.querySelectorAll('.result-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const resultsArea = document.getElementById(UI_IDS.RESULTS_AREA);
    const resultsGrid = document.getElementById(UI_IDS.RESULTS_GRID);
    const messagesArea = document.getElementById('messages-area');
    if (tab.textContent === 'Messages') {
      resultsArea.style.display = 'none';
      messagesArea.style.display = '';
      if (resultsMenuBar) resultsMenuBar.style.display = 'none';
    } else {
      resultsArea.style.display = '';
      messagesArea.style.display = 'none';
      if (resultsMenuBar) resultsMenuBar.style.display = 'flex';
      // resultsGrid内のtableのみ切り替え
      Array.from(resultsGrid.children).forEach(tbl => {
        tbl.style.display = (tbl.id === tab.dataset.resultsId) ? '' : 'none';
      });
    }
  });
};

// Resultsのデータセット登録ボタンの動作をセットアップ
export function setupRegisterDatasetHandler(ui) {
  const btn = document.getElementById('register-dataset-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    // アクティブなResultsタブのテーブルIDを取得
    const tabs = document.querySelector('.results-tabs');
    const activeTab = tabs && tabs.querySelector('.result-tab.active');
    if (!activeTab) {
      ui && ui.showError && ui.showError('Resultsタブがアクティブな時のみ登録できます');
      return;
    }
    const tableId = activeTab.dataset.resultsId || 'results-table';
    const table = document.getElementById(tableId);
    if (!table) {
      ui && ui.showError && ui.showError('登録対象のテーブルが見つかりません');
      return;
    }
    // テーブルからデータ抽出
    const columns = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent);
    const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr => {
      const cells = Array.from(tr.querySelectorAll('td'));
      const obj = {};
      columns.forEach((col, i) => { obj[col] = cells[i]?.textContent ?? null; });
      return obj;
    });
    if (!columns.length || !rows.length) {
      ui && ui.showError && ui.showError('登録できるデータがありません');
      return;
    }
    // データセット名を入力
    const name = prompt('データセット名を入力してください', 'dataset_' + new Date().getTime());
    if (!name) return;
    // ストアに保存
    window.__DATASET_STORE__[name] = { columns, rows };
    ui && ui.showSuccess && ui.showSuccess(`データセット「${name}」を登録しました`);
    // サイドバーのデータセットツリーを更新
    updateDatasetTree();
  });
}
