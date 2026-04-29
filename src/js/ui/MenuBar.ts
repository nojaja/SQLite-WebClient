import { createMenuBarView } from './MenuBarView';
import { setupMenuBarController } from './MenuBarController';
import { createModal } from './Modal';

export const createMenuBar = () => {
  const menuBar = createMenuBarView();

  const fileGroup = menuBar.addMenuGroup('file-group');
  fileGroup.addMenuItem('new-db-button', 'database', 'New DB');
  fileGroup.addMenuItem('open-db-button', 'database_upload', 'Open');
  fileGroup.addMenuItem('save-db-button', 'save', 'Save');

  const queryGroup = menuBar.addMenuGroup('query-group');
  queryGroup.addMenuItem('new-query-button', 'post_add', 'New Query');
  queryGroup.addMenuItem('open-query-button', 'folder_open', 'Open Query');
  queryGroup.addMenuItem('save-query-button', 'save', 'Save Query');
  queryGroup.addMenuItem('run-button', 'play_arrow', 'Run');

  const helpModal = createModal({
    id: 'help-modal',
    contentHtml: `
      <h2>Help and License</h2>
      <ul>
        <li><a href="https://github.com/nojaja/SQLite-WebClient" target="_blank">GitHub Repository</a></li>
      </ul>
      <h3>Used Libraries and Licenses</h3>
      <ul>
        <li><a href="https://www.npmjs.com/package/@sqlite.org/sqlite-wasm" target="_blank">@sqlite.org/sqlite-wasm</a> (Apache-2.0)</li>
        <li><a href="https://www.npmjs.com/package/jquery" target="_blank">jQuery</a> (MIT)</li>
        <li><a href="https://www.npmjs.com/package/datatables.net-dt" target="_blank">DataTables</a> (MIT)</li>
        <li><a href="https://www.npmjs.com/package/dbgate-query-splitter" target="_blank">dbgate-query-splitter</a> (MIT)</li>
      </ul>
    `
  });

  const helpGroup = menuBar.addMenuGroup('help-group');
  helpGroup.addMenuItem('help-button', 'help', 'Help', () => helpModal.showModal());

  return menuBar;
};

export { createMenuBarView, setupMenuBarController };