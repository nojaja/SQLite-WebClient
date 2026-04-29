export const DATASET_DB_ALIAS = 'dataset';
const DATASET_STORAGE_KEY = 'sqlite-webclient.dataset-db.v1';
const SIMPLE_IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const STRICT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

const escapeIdentifier = (value) => String(value).replace(/"/g, '""');

export const formatIdentifier = (value) => (
  SIMPLE_IDENTIFIER_PATTERN.test(value) ? value : `"${escapeIdentifier(value)}"`
);

export const buildSelectAllQuery = (schemaName, tableName, limit = 100) => {
  const qualifiedName = (!schemaName || schemaName === 'main')
    ? formatIdentifier(tableName)
    : `${formatIdentifier(schemaName)}.${formatIdentifier(tableName)}`;
  return `SELECT * FROM ${qualifiedName} LIMIT ${limit}`;
};

export const setEditorQueryForTable = (editor, tableName, schemaName = 'main') => {
  if (!editor) return;
  editor.value = buildSelectAllQuery(schemaName, tableName);
  editor.focus();
};

const uint8ArrayToBase64 = (bytes) => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
};

const base64ToUint8Array = (base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const loadPersistedDataset = () => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  const encoded = window.localStorage.getItem(DATASET_STORAGE_KEY);
  return encoded ? base64ToUint8Array(encoded) : null;
};

export const persistDatasetDatabase = (db) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const exported = db.exportAttachedDatabase(DATASET_DB_ALIAS);
  window.localStorage.setItem(DATASET_STORAGE_KEY, uint8ArrayToBase64(exported));
};

export const ensureDatasetDatabase = (db) => {
  if (db.hasAttachedDatabase(DATASET_DB_ALIAS)) return false;
  db.attachDatabase(DATASET_DB_ALIAS, loadPersistedDataset());
  return true;
};

export const listDatasetTables = (db) => db.getDatabaseSchema(DATASET_DB_ALIAS).tables || [];

export const getDatasetRows = (db, tableName) => {
  const sql = `SELECT * FROM ${formatIdentifier(DATASET_DB_ALIAS)}.${formatIdentifier(tableName)}`;
  const [result] = db.db.exec(sql);
  if (!result) return [];
  return result.values.map((values) => Object.fromEntries(result.columns.map((column, index) => [column, values[index]])));
};

const normalizeTableNameSeed = (value) => {
  const trimmed = String(value || '').trim();
  return trimmed || 'dataset';
};

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

const inferColumnType = (value) => {
  if (value === null || value === undefined || value === '') return 'TEXT';
  const normalized = String(value).trim();
  if (STRICT_DATE_PATTERN.test(normalized)) return 'DATE';
  if (/^-?\d+$/.test(normalized)) return 'INTEGER';
  if (/^-?(?:\d+\.\d+|\d+|\.\d+)(?:[eE][+-]?\d+)?$/.test(normalized)) return 'REAL';
  return 'TEXT';
};

const buildColumnDefinitions = (columns, sampleRow = {}) => columns.map((column) => ({
  name: column,
  type: inferColumnType(sampleRow[column])
}));

const createDatasetTable = (db, tableName, columnDefinitions) => {
  const sql = `CREATE TABLE ${formatIdentifier(DATASET_DB_ALIAS)}.${formatIdentifier(tableName)} (${columnDefinitions.map(({ name, type }) => `${formatIdentifier(name)} ${type}`).join(', ')})`;
  db.db.exec(sql);
};

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
    } catch (_) {
      // ignore rollback errors
    }
    throw error;
  } finally {
    statement.finalize();
  }
};

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

export const registerHtmlTableAsDataset = (db, requestedName, tableElement) => {
  const columns = Array.from(tableElement.querySelectorAll('thead th')).map((th) => th.textContent);
  const rows = Array.from(tableElement.querySelectorAll('tbody tr')).map((tr) => {
    const cells = Array.from(tr.querySelectorAll('td'));
    return Object.fromEntries(columns.map((column, index) => [column, cells[index]?.textContent ?? null]));
  });
  return registerRowsAsDatasetTable(db, requestedName, columns, rows);
};

const getFileBaseName = (fileName) => String(fileName).replace(/\.[^.]+$/, '');

export const importCsvFileAsDataset = async (db, file) => {
  ensureDatasetDatabase(db);
  const text = await file.text();
  const { parse } = await import('csv-parse/browser/esm');
  const rows = await new Promise((resolve, reject) => {
    parse(text, { columns: true, skip_empty_lines: true }, (error, output) => {
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
