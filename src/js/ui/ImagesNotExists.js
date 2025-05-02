import { UI_IDS } from './constants.js';

// Results と Messages のセクションを作成
export const createResultsSection = () => {
  const resultsTabs = document.createElement('div');
  resultsTabs.classList.add('results-tabs');
  const resTab = document.createElement('div');
  resTab.classList.add('result-tab', 'active');
  resTab.textContent = 'Results';
  const msgTab = document.createElement('div');
  msgTab.classList.add('result-tab');
  msgTab.textContent = 'Messages';
  resultsTabs.appendChild(resTab);
  resultsTabs.appendChild(msgTab);

  // グリッドエリア
  const resultsGrid = document.createElement('div');
  resultsGrid.id = UI_IDS.RESULTS_GRID;
  resultsGrid.classList.add('results-grid');
  // DataTables 用の table 要素を常に用意
  const resultsTable = document.createElement('table');
  resultsTable.id = 'results-table';
  // DataTablesのスタイルを適用するクラスを追加
  resultsTable.classList.add('display', 'dataTable');
  // 初期状態で空のtbodyを作成しておく
  const emptyTbody = document.createElement('tbody');
  resultsTable.appendChild(emptyTbody);
  resultsGrid.appendChild(resultsTable);

  const messagesArea = document.createElement('div');
  messagesArea.id = 'messages-area';
  messagesArea.classList.add('messages-area');
  messagesArea.style.display = 'none';

  return { resultsTabs, resultsGrid, messagesArea };
};

// 複数Resultsタブ・テーブル追加用
export const addResults = (label, tableId = null) => {
  const tabs = document.querySelector('.results-tabs');
  const resultsGrid = document.getElementById(UI_IDS.RESULTS_GRID);
  if (!tabs || !resultsGrid) return;

  // タブ作成
  const resTab = document.createElement('div');
  resTab.classList.add('result-tab');
  resTab.textContent = label;
  resTab.dataset.resultsId = tableId || `results-table-${label}`;
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
  if (!tabs) return;
  tabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.result-tab');
    if (!tab) return;
    tabs.querySelectorAll('.result-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const resultsGrid = document.getElementById(UI_IDS.RESULTS_GRID);
    const messagesArea = document.getElementById('messages-area');
    if (tab.textContent === 'Messages') {
      resultsGrid.style.display = 'none';
      messagesArea.style.display = '';
    } else {
      resultsGrid.style.display = '';
      messagesArea.style.display = 'none';
      // 複数テーブル切り替え
      Array.from(resultsGrid.children).forEach(tbl => {
        tbl.style.display = (tbl.id === tab.dataset.resultsId) ? '' : 'none';
      });
    }
  });
};