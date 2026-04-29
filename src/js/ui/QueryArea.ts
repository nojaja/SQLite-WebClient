import { UI_IDS } from './constants';

/**
 * query-area（クエリエディタ部分）を作成する関数
 * @returns 生成したクエリエリア要素群
 */
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

/**
 * sql-editor要素を取得
 * @returns SQLエディタ要素または null
 */
export function getSqlEditor(): HTMLTextAreaElement | null {
  return document.getElementById('sql-editor') as HTMLTextAreaElement | null;
}

/**
 * アクティブなquery-area内のsql-editorを取得
 * @returns アクティブなSQLエディタ要素または null
 */
export function getActiveSqlEditor(): HTMLTextAreaElement | null {
  const activeQueryArea = document.querySelector('.query-area.active');
  return activeQueryArea?.querySelector('textarea#sql-editor') as HTMLTextAreaElement | null;
}

/**
 * sql-editorの値を取得
 * @returns エディタのテキスト値
 */
export function getSqlEditorValue() {
  const editor = getSqlEditor();
  return editor ? editor.value : '';
}

/**
 * sql-editorの値を設定
 * @param value 設定するテキスト値
 * @returns void
 */
export function setSqlEditorValue(value: string) {
  const editor = getSqlEditor();
  if (editor) editor.value = value;
}
