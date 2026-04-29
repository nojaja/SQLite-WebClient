import $ from 'jquery';
import { UI_IDS } from './constants'; // Updated import path
// DataTablesプラグインを初期化
import 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.min.css';
// FixedHeader拡張機能
import 'datatables.net-fixedheader-dt';
import 'datatables.net-fixedheader-dt/css/fixedHeader.dataTables.min.css';
const DataTable = $.fn.DataTable;
void UI_IDS;
void DataTable;

/**
 * 結果グリッドを更新する関数（tableId指定対応）
 * @param data クエリ結果データ
 * @param data.columns カラム名の配列
 * @param data.results 行データの配列
 * @param tableId テーブルID
 * @returns void
 */
export const updateResultsGrid = (data: { columns: string[]; results: Record<string, unknown>[] }, tableId = 'results-table') => {
  if (!data || !data.results) return;
  // テーブルを取得して中身をクリア
  const table = document.getElementById(tableId) as HTMLElement | null;
  if (!table) return;
  // ヘッダーとボディを作り直し
  table.innerHTML = '';
  // theadとtbodyを構築
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  data.columns.forEach((col: string) => {
    const th = document.createElement('th');
    th.textContent = col;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);
  // tbodyの構築
  const tbody = document.createElement('tbody');
  data.results.forEach((row: Record<string, unknown>) => {
    const tr = document.createElement('tr');
    data.columns.forEach((col: string) => {
      const td = document.createElement('td');
      td.textContent = row[col] != null ? String(row[col]) : '';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
};

/**
 * 現在アクティブなResultsタブのテーブルからデータを取得
 * @returns カラムと行データを含むオブジェクトまたは null
 */
export function getCurrentResults() {
  const tabs = document.querySelector('.results-tabs');
  if (!tabs) return null;
  const activeTab = tabs.querySelector('.result-tab.active') as HTMLElement | null;
  if (!activeTab) return null;
  const tableId = activeTab.dataset.resultsId || 'results-table';
  const table = document.getElementById(tableId);
  if (!table) return null;
  // カラム名取得
  const columns = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent);
  // 行データ取得
  const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr =>
    Array.from(tr.querySelectorAll('td')).map(td => td.textContent)
  );
  return { columns, rows };
}
