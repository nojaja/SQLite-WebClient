import $ from 'jquery';
import '../css/app.css';
import 'datatables.net-dt/css/dataTables.dataTables.min.css';
import 'datatables.net-fixedheader-dt/css/fixedHeader.dataTables.min.css';
import { createUI } from './ui';
import SQLiteManager from './SQLiteManager';
import TabManager from './tabManager';
import { setupEventHandlers } from './events';

window.$ = window.jQuery = $;

const main = async () => {
  const ui = createUI();
  const tabManager = new TabManager({
    containerId: 'query-tabs',
    editorId: 'sql-editor',
    resultsId: 'results-grid',
    messagesId: 'messages-area'
  });
  window.tabManager = tabManager;

  const newQueryBtn = document.getElementById('new-query-button');
  if (newQueryBtn) {
    newQueryBtn.addEventListener('click', () => {
      const mainArea = document.getElementById('main-area');
      if (mainArea && mainArea.style.display === 'none') {
        mainArea.style.display = '';
      }
      tabManager.addTab('Query');
    });
  }

  const db = await SQLiteManager.initialize(null, { print: console.log, printErr: console.error });
  setupEventHandlers(ui, db, tabManager);
};

void (async () => {
  await main();
})();