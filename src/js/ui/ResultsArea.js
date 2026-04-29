import { UI_IDS } from './constants.js';
import { updateDatasetTree } from './Sidebar.js';
import { registerHtmlTableAsDataset } from '../datasetDb.js';

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
export function setupRegisterDatasetHandler(ui, db, onDatasetChanged) {
  const btn = document.getElementById('register-dataset-btn');
  if (!btn || btn.dataset.registerBound === 'true') return;
  btn.dataset.registerBound = 'true';

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

    // データセット名を入力
    const name = prompt('データセット名を入力してください', 'dataset_' + new Date().getTime());
    if (!name) return;

    try {
      const registeredName = registerHtmlTableAsDataset(db, name, table);
      ui && ui.showSuccess && ui.showSuccess(`データセット「${registeredName}」を登録しました`);
      updateDatasetTree(db);
      onDatasetChanged && onDatasetChanged();
    } catch (error) {
      ui && ui.showError && ui.showError(error.message || 'データセット登録に失敗しました');
    }
  });
}
