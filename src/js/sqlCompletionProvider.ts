import * as monaco from 'monaco-editor';

// SQLite SQL 予約語・関数・構文キーワード一覧
const SQL_KEYWORDS = [
  // DML
  'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'FROM', 'WHERE',
  'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'CROSS JOIN', 'OUTER JOIN',
  'ON', 'USING', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET',
  'UNION', 'UNION ALL', 'INTERSECT', 'EXCEPT',
  'WITH', 'AS', 'DISTINCT', 'ALL', 'INTO', 'VALUES', 'SET', 'RETURNING',
  // DDL
  'CREATE', 'ALTER', 'DROP', 'TABLE', 'VIEW', 'INDEX', 'TRIGGER',
  'TEMP', 'TEMPORARY',
  'IF EXISTS', 'IF NOT EXISTS',
  'PRIMARY KEY', 'FOREIGN KEY', 'REFERENCES',
  'UNIQUE', 'NOT NULL', 'DEFAULT', 'CHECK', 'CONSTRAINT',
  'AUTOINCREMENT', 'ROWID', 'WITHOUT ROWID',
  'RENAME TO', 'ADD COLUMN',
  // TCL
  'BEGIN', 'COMMIT', 'ROLLBACK', 'SAVEPOINT', 'RELEASE', 'TRANSACTION',
  'DEFERRED', 'IMMEDIATE', 'EXCLUSIVE',
  // Operators / Misc
  'AND', 'OR', 'NOT', 'IN', 'NOT IN', 'LIKE', 'GLOB', 'REGEXP', 'MATCH',
  'BETWEEN', 'EXISTS', 'NOT EXISTS',
  'IS', 'IS NOT', 'IS NULL', 'IS NOT NULL',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'CAST', 'COLLATE', 'INDEXED BY',
  'ASC', 'DESC', 'NULLS FIRST', 'NULLS LAST',
  // PRAGMA / ATTACH (SQLite 固有)
  'PRAGMA', 'ATTACH', 'DETACH', 'VACUUM', 'ANALYZE', 'EXPLAIN', 'EXPLAIN QUERY PLAN',
];

const SQL_FUNCTIONS = [
  // 集計関数
  'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'GROUP_CONCAT', 'TOTAL',
  // スカラー関数
  'ABS', 'COALESCE', 'IFNULL', 'NULLIF', 'IIF',
  'LENGTH', 'SUBSTR', 'INSTR', 'REPLACE', 'TRIM', 'LTRIM', 'RTRIM',
  'UPPER', 'LOWER', 'PRINTF', 'FORMAT', 'LIKE', 'GLOB',
  'ROUND', 'FLOOR', 'CEILING', 'SIGN', 'RANDOM', 'RANDOMBLOB',
  'HEX', 'UNHEX', 'ZEROBLOB', 'QUOTE', 'CHAR', 'UNICODE', 'OCT',
  'TYPEOF', 'LAST_INSERT_ROWID', 'CHANGES', 'TOTAL_CHANGES', 'SQLITE_VERSION',
  // 日付・時刻関数
  'DATE', 'TIME', 'DATETIME', 'JULIANDAY', 'UNIXEPOCH', 'STRFTIME',
  'CURRENT_TIMESTAMP', 'CURRENT_DATE', 'CURRENT_TIME',
  // JSON 関数
  'JSON', 'JSON_ARRAY', 'JSON_OBJECT', 'JSON_EXTRACT', 'JSON_INSERT',
  'JSON_REPLACE', 'JSON_SET', 'JSON_REMOVE', 'JSON_TYPE', 'JSON_VALID',
  'JSON_PATCH', 'JSON_EACH', 'JSON_TREE', 'JSON_QUOTE',
  // ウィンドウ関数
  'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'PERCENT_RANK', 'CUME_DIST',
  'NTILE', 'LAG', 'LEAD', 'FIRST_VALUE', 'LAST_VALUE', 'NTH_VALUE',
];

/**
 * 処理名: SQL補完プロバイダー登録
 * 処理概要: Monaco Editor の SQL 言語に対して予約語・関数の補完候補を登録する
 * 実装理由: SQLite SQL のオートコンプリートをユーザーに提供するため
 */
export function registerSqlCompletionProvider(): monaco.IDisposable {
  return monaco.languages.registerCompletionItemProvider('sql', {
    triggerCharacters: [' ', '\n', '\t', '.', '('],

    provideCompletionItems(
      _model: monaco.editor.ITextModel,
      _position: monaco.Position,
      _context: monaco.languages.CompletionContext,
      _token: monaco.CancellationToken
    ): monaco.languages.CompletionList {
      const keywordItems: monaco.languages.CompletionItem[] = SQL_KEYWORDS.map(kw => ({
        label: kw,
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: kw,
        detail: 'SQL Keyword',
        range: undefined as unknown as monaco.IRange,
      }));

      const functionItems: monaco.languages.CompletionItem[] = SQL_FUNCTIONS.map(fn => ({
        label: fn,
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: `${fn}($0)`,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        detail: 'SQL Function',
        range: undefined as unknown as monaco.IRange,
      }));

      return { suggestions: [...keywordItems, ...functionItems] };
    },
  });
}
