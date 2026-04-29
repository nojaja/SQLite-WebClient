import { UI_IDS } from './constants';
import { updateDatasetTree } from './Sidebar';
import { registerHtmlTableAsDataset } from '../datasetDb';

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

export function getResultsArea() {
  return document.getElementById(UI_IDS.RESULTS_AREA);
}

export function showResultsArea() {
  const area = getResultsArea();
  if (area) area.style.display = '';
}

export function hideResultsArea() {
  const area = getResultsArea();
  if (area) area.style.display = 'none';
}

export function setupRegisterDatasetHandler(ui, db, onDatasetChanged) {
  const btn = document.getElementById('register-dataset-btn');
  if (!btn || btn.dataset.registerBound === 'true') return;
  btn.dataset.registerBound = 'true';

  btn.addEventListener('click', () => {
    const tabs = document.querySelector('.results-tabs');
    const activeTab = tabs && tabs.querySelector('.result-tab.active');
    if (!activeTab) {
      ui && ui.showError && ui.showError('No active results tab found');
      return;
    }

    const tableId = activeTab.dataset.resultsId || 'results-table';
    const table = document.getElementById(tableId);
    if (!table) {
      ui && ui.showError && ui.showError('Results table not found');
      return;
    }

    const name = prompt('Enter dataset name', 'dataset_' + new Date().getTime());
    if (!name) return;

    try {
      const registeredName = registerHtmlTableAsDataset(db, name, table);
      ui && ui.showSuccess && ui.showSuccess(`Dataset '${registeredName}' registered`);
      updateDatasetTree(db);
      onDatasetChanged && onDatasetChanged();
    } catch (error) {
      ui && ui.showError && ui.showError(error.message || 'Failed to register dataset');
    }
  });
}
