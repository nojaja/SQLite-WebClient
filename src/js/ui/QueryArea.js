import { UI_IDS } from './constants.js';

// query-area（クエリエディタ部分）を作成する関数
export const createQueryArea = () => {
  const queryArea = document.createElement('div');
  queryArea.classList.add('query-area', 'active');
  queryArea.id = 'query-area-query1';

  // クエリメニューバー
  const queryMenuBar = document.createElement('div');
  queryMenuBar.classList.add('query-menu-bar');
  queryMenuBar.id = 'query-menu-bar-query1';
  // 参照データプルダウン
  const refLabel = document.createElement('label');
  refLabel.textContent = '参照データ:';
  refLabel.setAttribute('for', 'ref-dataset-select-query1');
  refLabel.style.marginRight = '6px';
  const refSelect = document.createElement('select');
  refSelect.id = 'ref-dataset-select-query1';
  refSelect.classList.add('ref-dataset-select');
  const noneOpt = document.createElement('option');
  noneOpt.value = '';
  noneOpt.textContent = 'なし';
  refSelect.appendChild(noneOpt);
  const dsStore = window.__DATASET_STORE__ || {};
  Object.keys(dsStore).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    refSelect.appendChild(opt);
  });
  queryMenuBar.appendChild(refLabel);
  queryMenuBar.appendChild(refSelect);
  // 実行エンジンプルダウン
  const engineLabel = document.createElement('label');
  engineLabel.textContent = '実行エンジン:';
  engineLabel.setAttribute('for', 'engine-select-query1');
  engineLabel.style.marginLeft = '16px';
  engineLabel.style.marginRight = '6px';
  const engineSelect = document.createElement('select');
  engineSelect.id = 'engine-select-query1';
  engineSelect.classList.add('engine-select');
  const engines = ['SQL', 'jsonata'];
  engines.forEach(engine => {
    const opt = document.createElement('option');
    opt.value = engine;
    opt.textContent = engine;
    engineSelect.appendChild(opt);
  });
  queryMenuBar.appendChild(engineLabel);
  queryMenuBar.appendChild(engineSelect);
  queryArea.appendChild(queryMenuBar);

  // クエリエディタ
  const queryEditor = document.createElement('div');
  queryEditor.id = UI_IDS.QUERY_EDITOR;
  queryEditor.classList.add('query-editor');
  const editorTextarea = document.createElement('textarea');
  editorTextarea.id = 'sql-editor';
  editorTextarea.placeholder = 'SQLクエリを入力してください';
  editorTextarea.value = '';
  queryEditor.appendChild(editorTextarea);
  queryArea.appendChild(queryEditor);

  return { queryArea, queryEditor };
};

// sql-editor要素を取得
export function getSqlEditor() {
  return document.getElementById('sql-editor');
}

// アクティブなquery-area内のsql-editorを取得
export function getActiveSqlEditor() {
  const activeQueryArea = document.querySelector('.query-area.active');
  return activeQueryArea && activeQueryArea.querySelector('textarea#sql-editor');
}

// sql-editorの値を取得
export function getSqlEditorValue() {
  const editor = getSqlEditor();
  return editor ? editor.value : '';
}

// sql-editorの値を設定
export function setSqlEditorValue(value) {
  const editor = getSqlEditor();
  if (editor) editor.value = value;
}
