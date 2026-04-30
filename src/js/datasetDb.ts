export const DATASET_DB_ALIAS = 'dataset';
const DATASET_STORAGE_KEY = 'sqlite-webclient.dataset-db.v1';
const SIMPLE_IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const STRICT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

/**
 * 処理名: 識別子エスケープ
 *
 * 処理概要:
 * SQL 識別子内のダブルクォートをエスケープする
 *
 * 実装理由:
 * SQLite でダブルクォートを含む識別子を安全に扱うため、
 * `"` を `""` に置換して SQL インジェクションを防ぐ
 *
 * @param value エスケープ対象の識別子文字列
 * @returns エスケープ済み文字列
 */
const escapeIdentifier = (value) => String(value).replace(/"/g, '""');

/**
 * 処理名: 識別子フォーマット
 *
 * 処理概要:
 * SQL 識別子を SQLite 構文で安全に使用できる形式に変換する
 *
 * 実装理由:
 * 英数字・アンダースコアのみの単純識別子はそのまま使用し、
 * それ以外はダブルクォートで囲んで SQLite の識別子ルールに準拠させるため
 *
 * @param value フォーマット対象の識別子文字列
 * @returns フォーマット済み識別子
 */
export const formatIdentifier = (value) => (
  SIMPLE_IDENTIFIER_PATTERN.test(value) ? value : `"${escapeIdentifier(value)}"`
);

/**
 * 処理名: SELECT クエリ生成
 *
 * 処理概要:
 * 指定スキーマ・テーブルの全件取得 SELECT 文を生成する
 *
 * 実装理由:
 * Sidebar クリック時の SQL 挿入処理を共通化し、
 * スキーマ指定の有無をここで吸収することで呼び出し元をシンプルに保つため
 *
 * @param schemaName スキーマ名（省略または 'main' の場合はスキーマ修飾を省く）
 * @param tableName テーブル名
 * @param limit 取得上限件数（デフォルト 100）
 * @returns SELECT クエリ文字列
 */
export const buildSelectAllQuery = (schemaName, tableName, limit = 100) => {
  const qualifiedName = (!schemaName || schemaName === 'main')
    ? formatIdentifier(tableName)
    : `${formatIdentifier(schemaName)}.${formatIdentifier(tableName)}`;
  return `SELECT * FROM ${qualifiedName} LIMIT ${limit}`;
};

/**
 * 処理名: バイナリ→Base64 変換
 *
 * 処理概要:
 * Uint8Array を Base64 文字列に変換する
 *
 * 実装理由:
 * SQLite バイナリデータを localStorage に文字列として保存するため
 *
 * @param bytes 変換対象のバイナリデータ
 * @returns Base64 エンコード文字列
 */
const uint8ArrayToBase64 = (bytes) => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
};

/**
 * 処理名: Base64→バイナリ変換
 *
 * 処理概要:
 * Base64 文字列を Uint8Array に変換する
 *
 * 実装理由:
 * localStorage から読み込んだ Base64 文字列を SQLite WASM に渡せる
 * バイナリ形式に戻すため
 *
 * @param base64 変換対象の Base64 文字列
 * @returns バイナリデータ
 */
const base64ToUint8Array = (base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

/**
 * 処理名: データセット永続化データ読み込み
 *
 * 処理概要:
 * localStorage から保存済みデータセット DB のバイナリデータを読み込む
 *
 * 実装理由:
 * ページ再読込後にデータセット DB を復元するため、
 * localStorage に保存したバイナリを取り出す
 *
 * @returns 保存済みバイナリデータ、未保存の場合は null
 */
const loadPersistedDataset = () => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  const encoded = window.localStorage.getItem(DATASET_STORAGE_KEY);
  return encoded ? base64ToUint8Array(encoded) : null;
};

/**
 * 処理名: データセット DB 永続化
 *
 * 処理概要:
 * データセット DB をエクスポートして localStorage に保存する
 *
 * 実装理由:
 * ページ再読込後もデータセットを復元できるよう、
 * 変更のたびにバイナリを localStorage に書き込む
 *
 * @param db SQLiteManager インスタンス
 * @returns void
 */
export const persistDatasetDatabase = (db) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const exported = db.exportAttachedDatabase(DATASET_DB_ALIAS);
  window.localStorage.setItem(DATASET_STORAGE_KEY, uint8ArrayToBase64(exported));
};

/**
 * 処理名: データセット DB アタッチ保証
 *
 * 処理概要:
 * データセット DB が未アタッチの場合にアタッチする
 *
 * 実装理由:
 * 各操作の前に必ず dataset DB が使える状態にするための前提条件チェックを
 * 一か所にまとめ、呼び出し元で重複チェックを書かずに済む設計とするため
 *
 * @param db SQLiteManager インスタンス
 * @returns アタッチした場合 true、既にアタッチ済みの場合 false
 */
export const ensureDatasetDatabase = (db) => {
  if (db.hasAttachedDatabase(DATASET_DB_ALIAS)) return false;
  db.attachDatabase(DATASET_DB_ALIAS, loadPersistedDataset());
  return true;
};

/**
 * 処理名: データセットテーブル一覧取得
 *
 * 処理概要:
 * データセット DB に存在するテーブル名の一覧を返す
 *
 * 実装理由:
 * サイドバーの Dataset ツリー表示に必要なテーブル名リストを
 * スキーマ取得ロジックから分離して提供するため
 *
 * @param db SQLiteManager インスタンス
 * @returns テーブル名の配列
 */
export const listDatasetTables = (db) => db.getDatabaseSchema(DATASET_DB_ALIAS).tables || [];

/**
 * 処理名: データセットテーブル行取得
 *
 * 処理概要:
 * データセット DB の指定テーブルから全行をオブジェクト配列として取得する
 *
 * 実装理由:
 * UI からデータセットの中身を参照する際に、
 * カラム名をキーとするオブジェクト形式で返すことで
 * 呼び出し元での列マッピングを不要にするため
 *
 * @param db SQLiteManager インスタンス
 * @param tableName 取得対象のテーブル名
 * @returns 行データのオブジェクト配列
 */
export const getDatasetRows = (db, tableName) => {
  const sql = `SELECT * FROM ${formatIdentifier(DATASET_DB_ALIAS)}.${formatIdentifier(tableName)}`;
  const [result] = db.db.exec(sql);
  if (!result) return [];
  return result.values.map((values) => Object.fromEntries(result.columns.map((column, index) => [column, values[index]])));
};

/**
 * 処理名: テーブル名シード正規化
 *
 * 処理概要:
 * 入力値をトリムし、空の場合はデフォルト名 'dataset' を返す
 *
 * 実装理由:
 * ファイル名や結果セット名が空・undefined の場合でも
 * 有効なテーブル名を生成できるようにするため
 *
 * @param value テーブル名の元になる文字列
 * @returns 正規化されたテーブル名文字列
 */
const normalizeTableNameSeed = (value) => {
  const trimmed = String(value || '').trim();
  return trimmed || 'dataset';
};

/**
 * 処理名: データセットテーブル名解決
 *
 * 処理概要:
 * 要求されたテーブル名が既存と重複する場合に連番サフィックスを付与して
 * ユニークなテーブル名を決定する
 *
 * 実装理由:
 * 同名テーブルを上書き削除しないよう自動採番で安全にインポートできる設計とするため
 *
 * @param db SQLiteManager インスタンス
 * @param requestedName 希望するテーブル名
 * @returns 重複のない確定テーブル名
 */
export const resolveDatasetTableName = (db, requestedName) => {
  const baseName = normalizeTableNameSeed(requestedName);
  const existing = new Set(listDatasetTables(db));
  if (!existing.has(baseName)) return baseName;
  let suffix = 1;
  let candidate = `${baseName}_${suffix}`;
  while (existing.has(candidate)) {
    suffix += 1;
    candidate = `${baseName}_${suffix}`;
  }
  return candidate;
};

/**
 * 処理名: 列型推論
 *
 * 処理概要:
 * サンプル値から SQLite 列型（DATE / INTEGER / REAL / TEXT）を推論する
 *
 * 実装理由:
 * CSV は文字列形式で渡されるため 1 行目の値から型を自動判定し、
 * SQLite での日付比較・数値演算が正しく動作するカラム型を設定するため。
 * DATE を最優先とすることで日付の並び替えが正確に機能する
 *
 * @param value 型推論の対象となる値
 * @returns 推定された SQLite 列型名（'DATE' | 'INTEGER' | 'REAL' | 'TEXT'）
 */
const inferColumnType = (value) => {
  if (value === null || value === undefined || value === '') return 'TEXT';
  const normalized = String(value).trim();
  if (STRICT_DATE_PATTERN.test(normalized)) return 'DATE';
  if (/^-?\d+$/.test(normalized)) return 'INTEGER';
  if (/^-?(?:\d+\.\d+|\d+|\.\d+)(?:[eE][+-]?\d+)?$/.test(normalized)) return 'REAL';
  return 'TEXT';
};

/**
 * 処理名: 列定義生成
 *
 * 処理概要:
 * カラム名リストとサンプル行から CREATE TABLE 用の列定義配列を生成する
 *
 * 実装理由:
 * 型推論を列定義生成と分離することで単体テストを容易にし、
 * CREATE TABLE 構文の組み立てを一か所に集約するため
 *
 * @param columns カラム名の配列
 * @param sampleRow 型推論に使用するサンプル行データ
 * @returns 列定義（name / type）オブジェクトの配列
 */
const buildColumnDefinitions = (columns, sampleRow = {}) => columns.map((column) => ({
  name: column,
  type: inferColumnType(sampleRow[column])
}));

/**
 * 処理名: データセットテーブル作成
 *
 * 処理概要:
 * データセット DB に指定スキーマの新規テーブルを作成する
 *
 * 実装理由:
 * CREATE TABLE 構文の組み立てと実行をここに集約し、
 * テーブル作成ロジックを登録処理から分離して可読性を高めるため
 *
 * @param db SQLiteManager インスタンス
 * @param tableName 作成するテーブル名
 * @param columnDefinitions 列定義（name / type）オブジェクトの配列
 * @returns void
 */
const createDatasetTable = (db, tableName, columnDefinitions) => {
  const sql = `CREATE TABLE ${formatIdentifier(DATASET_DB_ALIAS)}.${formatIdentifier(tableName)} (${columnDefinitions.map(({ name, type }) => `${formatIdentifier(name)} ${type}`).join(', ')})`;
  db.db.exec(sql);
};

/**
 * 処理名: データセットテーブル行挿入
 *
 * 処理概要:
 * データセット DB の指定テーブルに行データをトランザクションで一括挿入する
 *
 * 実装理由:
 * 大量行挿入を BEGIN/COMMIT でまとめてパフォーマンスを確保し、
 * エラー時は ROLLBACK して中途半端な状態にならないよう保護するため
 *
 * @param db SQLiteManager インスタンス
 * @param tableName 挿入先テーブル名
 * @param columns カラム名の配列
 * @param rows 挿入する行データのオブジェクト配列
 * @returns void
 */
const insertRowsIntoDataset = (db, tableName, columns, rows) => {
  if (!rows.length) return;
  const insertSql = `INSERT INTO ${formatIdentifier(DATASET_DB_ALIAS)}.${formatIdentifier(tableName)} (${columns.map(formatIdentifier).join(', ')}) VALUES (${columns.map((column) => `$${column}`).join(', ')})`;
  const statement = db.db.prepare(insertSql);
  try {
    db.db.exec('BEGIN');
    rows.forEach((row) => {
      statement.bind(Object.fromEntries(columns.map((column) => [column, row[column] ?? null])));
      statement.step();
      statement.reset();
    });
    db.db.exec('COMMIT');
  } catch (error) {
    try {
      db.db.exec('ROLLBACK');
    } catch {
      // ignore rollback errors
    }
    throw error;
  } finally {
    statement.finalize();
  }
};

/**
 * 処理名: 行データをデータセットテーブルとして登録
 *
 * 処理概要:
 * カラム名と行データ配列を受け取り、データセット DB に新規テーブルを作成して
 * データを挿入し、永続化する
 *
 * 実装理由:
 * SELECT 結果登録と CSV インポートの両方から呼ばれる共通登録エントリーポイントとして
 * テーブル作成・挿入・永続化の一連の流れをまとめるため
 *
 * @param db SQLiteManager インスタンス
 * @param requestedName 希望するテーブル名
 * @param columns カラム名の配列
 * @param rows 登録する行データのオブジェクト配列
 * @returns 登録されたテーブル名
 */
export const registerRowsAsDatasetTable = (db, requestedName, columns, rows) => {
  if (!columns.length || !rows.length) {
    throw new Error('登録できるデータがありません');
  }
  ensureDatasetDatabase(db);
  const tableName = resolveDatasetTableName(db, requestedName);
  createDatasetTable(db, tableName, buildColumnDefinitions(columns, rows[0] || {}));
  insertRowsIntoDataset(db, tableName, columns, rows);
  persistDatasetDatabase(db);
  return tableName;
};

/**
 * 処理名: HTML テーブルをデータセットとして登録
 *
 * 処理概要:
 * DOM の HTMLTableElement からカラム名・行データを抽出してデータセット DB に登録する
 *
 * 実装理由:
 * UI の結果テーブル（HTMLTableElement）を直接データセットに変換できるよう、
 * DOM 抽出ロジックを registerRowsAsDatasetTable と分離して責務を明確にするため
 *
 * @param db SQLiteManager インスタンス
 * @param requestedName 希望するテーブル名
 * @param tableElement 抽出元の HTMLElement（tbody/thead を持つテーブル）
 * @returns 登録されたテーブル名
 */
export const registerHtmlTableAsDataset = (db, requestedName, tableElement: HTMLElement) => {
  const columns = Array.from(tableElement.querySelectorAll('thead th')).map((th) => (th as HTMLElement).textContent ?? '');
  const rows = Array.from(tableElement.querySelectorAll('tbody tr')).map((tr) => {
    const cells = Array.from((tr as HTMLTableRowElement).querySelectorAll('td'));
    return Object.fromEntries(columns.map((column, index) => [column, (cells[index] as HTMLElement | undefined)?.textContent ?? null]));
  });
  return registerRowsAsDatasetTable(db, requestedName, columns, rows);
};

/**
 * 処理名: データセットテーブル削除
 *
 * 処理概要:
 * データセット DB の指定テーブルを DROP して永続化ストレージを更新する
 *
 * 実装理由:
 * ユーザーが不要になったデータセットを削除できるようにし、
 * 削除後に永続化を呼び出すことで localStorage と DB の状態を同期させるため
 *
 * @param db SQLiteManager インスタンス
 * @param tableName 削除対象のテーブル名
 * @returns void
 */
export const deleteDatasetTable = (db, tableName) => {
  ensureDatasetDatabase(db);
  const sql = `DROP TABLE IF EXISTS ${formatIdentifier(DATASET_DB_ALIAS)}.${formatIdentifier(tableName)}`;
  db.db.exec(sql);
  persistDatasetDatabase(db);
};

/**
 * 処理名: ファイルベース名取得
 *
 * 処理概要:
 * ファイル名から拡張子を除いたベース名を返す
 *
 * 実装理由:
 * CSV ファイルのファイル名をデータセットのテーブル名の初期値として利用するため
 *
 * @param fileName 拡張子付きファイル名
 * @returns 拡張子なしファイル名
 */
const getFileBaseName = (fileName) => String(fileName).replace(/\.[^.]+$/, '');

/**
 * 処理名: CSV ファイルをデータセットとしてインポート
 *
 * 処理概要:
 * File オブジェクトを読み込んで CSV をパースし、データセット DB にテーブルとして登録する
 *
 * 実装理由:
 * ユーザーが CSV ファイルを直接データセットに取り込めるようにし、
 * ブラウザ向け csv-parse を動的インポートすることでバンドルサイズを抑えるため
 *
 * @param db SQLiteManager インスタンス
 * @param file インポート対象の CSV File オブジェクト
 * @returns 登録されたテーブル名の Promise
 */
export const importCsvFileAsDataset = async (db, file: File) => {
  ensureDatasetDatabase(db);
  const text = await file.text();
  const { parse } = await import('csv-parse/browser/esm');
  const rows = await new Promise<Record<string, string>[]>((resolve, reject) => {
    parse(text, { columns: true, skip_empty_lines: true }, (error: Error | undefined, output: Record<string, string>[]) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(output);
    });
  });
  if (!rows.length) {
    throw new Error('CSVにデータがありません');
  }
  const columns = Object.keys(rows[0]);
  return registerRowsAsDatasetTable(db, getFileBaseName(file.name), columns, rows);
};
