// datatables.net/manual/vue に準拠した Vue3 版 DataTables セットアップ
import DataTableVue from 'datatables.net-vue3';
import DataTablesCore from 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.min.css';
// FixedHeader拡張機能
import 'datatables.net-fixedheader-dt';
import 'datatables.net-fixedheader-dt/css/fixedHeader.dataTables.min.css';

// Vue3 DataTable コンポーネントにコアライブラリを登録
DataTableVue.use(DataTablesCore);

/**
 * 結果グリッドを更新する関数（tableId指定対応）
 * @param data クエリ結果データ
 * @param data.columns カラム名の配列
 * @param data.results 行データの配列
 * @param tableId コンテナ要素のID
 * @returns void
 */
export const updateResultsGrid = (data: { columns: string[]; results: Record<string, unknown>[] }, tableId = 'results-table') => {
  if (!data || !data.results) return;
  // コンテナ要素を取得
  const containerEl = document.getElementById(tableId);
  if (!containerEl) return;

  // 既存の DataTable インスタンスを破棄してからコンテナをクリア
  const existingTable = containerEl.querySelector('table') as HTMLTableElement | null;
  if (existingTable && DataTablesCore.isDataTable(existingTable)) {
    new DataTablesCore(existingTable).destroy();
  }
  containerEl.innerHTML = '';

  // thead を構築して table に追加
  const table = document.createElement('table');
  table.classList.add('display');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  data.columns.forEach((col: string) => {
    const th = document.createElement('th');
    th.textContent = col;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);
  containerEl.appendChild(table);

  // DataTables を初期化（Vue版マニュアルと同じパターン）
  new DataTablesCore(table, {
    data: data.results,
    columns: data.columns.map(col => ({ data: col })),
    paging: true,
    searching: false,
    info: false,
    fixedHeader: false,
    layout: {
      topStart: null,
      topEnd: null,
      bottomStart: 'pageLength',
      bottomEnd: 'paging',
    },
  });
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
  const containerId = activeTab.dataset.resultsId || 'results-table';
  const containerEl = document.getElementById(containerId);
  if (!containerEl) return null;

  const tableEl = containerEl.querySelector('table') as HTMLTableElement | null;
  if (!tableEl || !DataTablesCore.isDataTable(tableEl)) return null;

  const dt = new DataTablesCore(tableEl);
  // カラム名取得
  const columns = Array.from(dt.columns().header().toArray()).map((th: Element) => th.textContent);
  // 行データ取得（DataTables API経由で全行を取得）
  const rows = (dt.rows().data().toArray() as Record<string, unknown>[]).map(row =>
    columns.map(col => col != null && row[col] != null ? String(row[col]) : null)
  );
  return { columns, rows };
}
