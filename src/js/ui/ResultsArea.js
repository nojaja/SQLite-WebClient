import { UI_IDS } from './constants.js';
import { updateDatasetTree } from './Sidebar.js';

// results-area（グリッド＋メニューバー）を生成する関数
export function createResultsArea() {
  // グリッドエリア
  const resultsGrid = document.createElement('div');
  resultsGrid.id = UI_IDS.RESULTS_GRID;
  resultsGrid.classList.add('results-grid');
  // 初期はテーブルを生成しない

  // メニューバー追加
  const resultsMenuBar = document.createElement('div');
  resultsMenuBar.classList.add('results-menu-bar');
  if (resultsMenuBar) resultsMenuBar.style.display = 'none';

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

  // results-areaでラップ
  const resultsArea = document.createElement('div');
  resultsArea.id = UI_IDS.RESULTS_AREA;
  resultsArea.classList.add('results-area');
  resultsArea.appendChild(resultsGrid);
  resultsArea.appendChild(resultsMenuBar);

  return { resultsArea, resultsGrid, resultsMenuBar };
}

// results-area要素を取得
export function getResultsArea() {
  return document.getElementById(UI_IDS.RESULTS_AREA);
}

// results-areaを表示
export function showResultsArea() {
  const area = getResultsArea();
  if (area) area.style.display = '';
}

// results-areaを非表示
export function hideResultsArea() {
  const area = getResultsArea();
  if (area) area.style.display = 'none';
}

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