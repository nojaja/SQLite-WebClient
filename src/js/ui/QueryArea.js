import { UI_IDS } from './constants.js';

// query-area（クエリエディタ部分）を作成する関数
export const createQueryArea = () => {
  const queryArea = document.createElement('div');
  queryArea.classList.add('query-area', 'active');
  queryArea.id = 'query-area-query1';

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
