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
// エラーメッセージを表示する関数
export const showError = (message) => {
  const statusBar = document.getElementById(UI_IDS.STATUS_BAR);
  const dbStatusEl = document.getElementById('db-status');
  const currentDbName = dbStatusEl ? dbStatusEl.textContent : '';
  statusBar.innerHTML = `<div class="status-error">${message}</div>`;

  // 5秒後にステータスバーをクリア
  setTimeout(() => {
    statusBar.innerHTML = `<div id="db-status" class="status-item">${currentDbName}</div>`;
  }, 5000);
};

// 成功メッセージを表示する関数
export const showSuccess = (message) => {
  const statusBar = document.getElementById(UI_IDS.STATUS_BAR);
  const dbStatusEl = document.getElementById('db-status');
  const currentDbName = dbStatusEl ? dbStatusEl.textContent : '';
  statusBar.innerHTML = `<div class="status-success">${message}</div>`;

  // 3秒後にステータスバーをクリア
  setTimeout(() => {
    statusBar.innerHTML = `<div id="db-status" class="status-item">${currentDbName}</div>`;
  }, 3000);
};