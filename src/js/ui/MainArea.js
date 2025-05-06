import { UI_IDS } from './constants.js';
import { createRowSplitter } from './rowSplitter.js';
import { createQueryArea } from './QueryArea.js';
import { createPanelArea } from './PanelArea.js';

// メインコンテンツエリアを作成する関数
export const createMainArea = () => {
  const mainArea = document.createElement('div');
  mainArea.id = UI_IDS.MAIN_AREA;
  mainArea.classList.add('main-area');

  // クエリタブコンテナを作成
  const queryTabs = document.createElement('div');
  queryTabs.id = UI_IDS.QUERY_TABS;
  queryTabs.classList.add('query-tabs');
  // 初期タブを追加
  const initialTab = document.createElement('div');
  initialTab.classList.add('query-tab', 'active');
  initialTab.dataset.tabId = 'query1';
  initialTab.textContent = 'Query1';
  // closeボタン追加
  const close = document.createElement('span');
  close.classList.add('close-tab');
  close.textContent = '×';
  close.addEventListener('click', e => {
    e.stopPropagation();
    if (window.tabManager) window.tabManager.closeTab('query1');
  });
  initialTab.appendChild(close);
  queryTabs.appendChild(initialTab);

  // query-area部分をQueryArea.jsから生成
  const { queryArea, queryEditor } = createQueryArea();

  mainArea.appendChild(queryTabs);
  mainArea.appendChild(queryArea);

  // rowSplitterは1つだけ生成し、アクティブなquery-areaの直後に配置
  const rowSplitter = createRowSplitter();
  mainArea.appendChild(rowSplitter);
  rowSplitter.setQueryEditor(queryEditor);

  // panel-areaでラップ
  const panelArea = createPanelArea();
  mainArea.appendChild(panelArea);

  return mainArea;
};
