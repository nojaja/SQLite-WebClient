import { UI_IDS } from './constants';
import { updateDatasetTree } from './Sidebar';
import { registerHtmlTableAsDataset } from '../datasetDb';

/**
 *
 * @returns 生成した結果エリア要素群
 */
export function createResultsArea() {
  const resultsGrid = document.createElement('div');
  resultsGrid.id = UI_IDS.RESULTS_GRID;
  resultsGrid.classList.add('results-grid');

  const resultsMenuBar = document.createElement('div');
  resultsMenuBar.classList.add('results-menu-bar');
  resultsMenuBar.style.display = 'none';

  const registerDatasetBtn = document.createElement('button');
  registerDatasetBtn.id = 'register-dataset-btn';
  registerDatasetBtn.classList.add('menu-button');
  registerDatasetBtn.innerHTML = '<span class="material-symbols-outlined">playlist_add</span> Register as Dataset';
  resultsMenuBar.appendChild(registerDatasetBtn);

  const csvDownloadButton = document.createElement('button');
  csvDownloadButton.id = 'csv-download-button';
  csvDownloadButton.classList.add('menu-button');
  csvDownloadButton.innerHTML = '<span class="material-symbols-outlined">download</span> Download CSV';
  resultsMenuBar.appendChild(csvDownloadButton);

  const resultsArea = document.createElement('div');
  resultsArea.id = UI_IDS.RESULTS_AREA;
  resultsArea.classList.add('results-area');
  resultsArea.appendChild(resultsGrid);
  resultsArea.appendChild(resultsMenuBar);

  return { resultsArea, resultsGrid, resultsMenuBar };
}

/**
 *
 * @returns 結果エリア要素または null
 */
export function getResultsArea() {
  return document.getElementById(UI_IDS.RESULTS_AREA);
}

/**
 *
 * @returns void
 */
export function showResultsArea() {
  const area = getResultsArea() as HTMLElement | null;
  if (area) area.style.display = '';
}

/**
 *
 * @returns void
 */
export function hideResultsArea() {
  const area = getResultsArea() as HTMLElement | null;
  if (area) area.style.display = 'none';
}

/**
 *
 * @param ui UIコントローラー
 * @param ui.showError エラー表示関数
 * @param ui.showSuccess 成功表示関数
 * @param db SQLiteManager インスタンス
 * @param onDatasetChanged データセット変更時コールバック
 * @returns void
 */
export function setupRegisterDatasetHandler(ui: { showError?: (msg: string) => void; showSuccess?: (msg: string) => void }, db: unknown, onDatasetChanged?: () => void) {
  const btn = document.getElementById('register-dataset-btn') as HTMLButtonElement | null;
  if (!btn || btn.dataset.registerBound === 'true') return;
  btn.dataset.registerBound = 'true';

  btn.addEventListener('click', () => {
    const tabs = document.querySelector('.results-tabs');
    const activeTab = tabs?.querySelector('.result-tab.active') as HTMLElement | null;
    if (!activeTab) {
      ui?.showError?.('No active results tab found');
      return;
    }

    const tableId = activeTab.dataset.resultsId || 'results-table';
    const table = document.getElementById(tableId) as HTMLElement | null;
    if (!table) {
      ui?.showError?.('Results table not found');
      return;
    }

    const name = prompt('Enter dataset name', 'dataset_' + new Date().getTime());
    if (!name) return;

    try {
      const registeredName = registerHtmlTableAsDataset(db, name, table);
      ui?.showSuccess?.(`Dataset '${registeredName}' registered`);
      updateDatasetTree(db);
      onDatasetChanged?.();
    } catch (error: unknown) {
      ui?.showError?.((error instanceof Error ? error.message : String(error)) || 'Failed to register dataset');
    }
  });
}
