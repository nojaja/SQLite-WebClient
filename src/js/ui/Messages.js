import { UI_IDS } from './constants.js'; // Updated import path

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