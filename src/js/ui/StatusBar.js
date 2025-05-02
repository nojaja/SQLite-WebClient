import { UI_IDS } from './constants.js';

// ステータスバーを作成する関数
export const createStatusBar = () => {
  const statusBar = document.createElement('div');
  statusBar.id = UI_IDS.STATUS_BAR;
  statusBar.classList.add('status-bar');

  const dbStatus = document.createElement('div');
  dbStatus.id = 'db-status';
  dbStatus.classList.add('status-item');
  dbStatus.textContent = 'Untitled.db';

  statusBar.appendChild(dbStatus);
  return statusBar;
};