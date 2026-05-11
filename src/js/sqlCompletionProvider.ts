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

/** DBスキーマ情報（エイリアスごとのオブジェクト名リスト） */
export interface DbSchema {
  alias: string;
  tables?: string[];
  views?: string[];
  indexes?: string[];
  triggers?: string[];
}

/** 動的に更新されるDBオブジェクト候補 */
let dbObjectSuggestions: monaco.languages.CompletionItem[] = [];

/**
 * 処理名: 補完候補生成
 * 処理概要: 指定内容から Monaco 補完アイテムを生成する
 * 実装理由: 候補生成ロジックを再利用し重複記述を削減するため
 * @param label 表示ラベル
 * @param kind 補完候補種別
 * @param detail 補足情報
 * @param insertText 挿入文字列（省略時は label を使用）
 * @returns 補完候補アイテム
 */
const createCompletionItem = (
  label: string,
  kind: monaco.languages.CompletionItemKind,
  detail: string,
  insertText?: string
): monaco.languages.CompletionItem => ({
  label,
  kind,
  insertText: insertText ?? label,
  detail,
  range: undefined as unknown as monaco.IRange,
});

/**
 * 処理名: メインDB短縮候補追加
 * 処理概要: main スキーマ配下のテーブルに対して短縮名候補を追加する
 * 実装理由: テーブル名のみ入力する利用パターンを補完対象に含めるため
 * @param target 追加先候補配列
 * @param schemaAlias スキーマエイリアス
 * @param detail 補完種別詳細
 * @param kind 補完候補種別
 * @param name テーブル名
 */
const addMainTableShortName = (
  target: monaco.languages.CompletionItem[],
  schemaAlias: string,
  detail: string,
  kind: monaco.languages.CompletionItemKind,
  name: string
): void => {
  if (schemaAlias !== 'main' || detail !== 'Table') return;
  target.push({
    ...createCompletionItem(name, kind, 'Table (main)', name),
    sortText: `z_${name}`,
  });
};

/**
 * 処理名: スキーマ候補追加
 * 処理概要: 1 スキーマ分のテーブル/ビュー/インデックス/トリガー候補を追加する
 * 実装理由: updateDbObjectSuggestions の複雑度を分離して可読性を高めるため
 * @param target 追加先候補配列
 * @param schema 対象スキーマ
 */
const appendSchemaSuggestions = (target: monaco.languages.CompletionItem[], schema: DbSchema): void => {
  const groups: Array<{ kind: monaco.languages.CompletionItemKind; detail: string; names: string[] }> = [
    { kind: monaco.languages.CompletionItemKind.Class, detail: 'Table', names: schema.tables ?? [] },
    { kind: monaco.languages.CompletionItemKind.Module, detail: 'View', names: schema.views ?? [] },
    { kind: monaco.languages.CompletionItemKind.Property, detail: 'Index', names: schema.indexes ?? [] },
    { kind: monaco.languages.CompletionItemKind.Event, detail: 'Trigger', names: schema.triggers ?? [] },
  ];

  for (const group of groups) {
    for (const name of group.names) {
      const qualified = `${schema.alias}.${name}`;
      target.push(createCompletionItem(qualified, group.kind, `${group.detail} (${schema.alias})`, qualified));
      addMainTableShortName(target, schema.alias, group.detail, group.kind, name);
    }
  }
};

/**
 * 処理名: データセット候補追加
 * 処理概要: データセットテーブル候補を補完候補配列へ追加する
 * 実装理由: dataset スキーマの候補追加処理を独立させるため
 * @param target 追加先候補配列
 * @param datasetAlias データセット DB エイリアス
 * @param datasetTables データセットテーブル一覧
 */
const appendDatasetSuggestions = (
  target: monaco.languages.CompletionItem[],
  datasetAlias: string,
  datasetTables: string[]
): void => {
  for (const name of datasetTables) {
    const qualified = `${datasetAlias}.${name}`;
    target.push(createCompletionItem(qualified, monaco.languages.CompletionItemKind.File, `Dataset (${datasetAlias})`, qualified));
  }
};

/**
 * 処理名: キーワード候補生成
 * 処理概要: SQL 予約語の補完候補配列を生成する
 * 実装理由: provideCompletionItems の責務を分離するため
 * @returns SQL キーワード補完候補配列
 */
const buildKeywordItems = (): monaco.languages.CompletionItem[] => SQL_KEYWORDS.map(kw => (
  createCompletionItem(kw, monaco.languages.CompletionItemKind.Keyword, 'SQL Keyword', kw)
));

/**
 * 処理名: 関数候補生成
 * 処理概要: SQL 関数のスニペット補完候補配列を生成する
 * 実装理由: provideCompletionItems の責務を分離するため
 * @returns SQL 関数補完候補配列
 */
const buildFunctionItems = (): monaco.languages.CompletionItem[] => SQL_FUNCTIONS.map(fn => ({
  ...createCompletionItem(fn, monaco.languages.CompletionItemKind.Function, 'SQL Function', `${fn}($0)`),
  insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
}));

/**
 * 処理名: SQL補完候補生成
 * 処理概要: キーワード・関数・DBオブジェクト候補を統合して返す
 * 実装理由: 補完プロバイダー本体の可読性を維持するため
 * @returns Monaco 補完リスト
 */
const provideSqlCompletionItems = (): monaco.languages.CompletionList => ({
  suggestions: [...buildKeywordItems(), ...buildFunctionItems(), ...dbObjectSuggestions]
});

/**
 * 処理名: DBオブジェクト候補更新
 * 処理概要: DBスキーマとデータセット一覧から補完候補を生成して内部状態を更新する
 * 実装理由: DB が変更されるたびに補完候補をリアルタイムに反映するため
 * @param schemas 表示対象のDBスキーマ配列
 * @param datasetAlias データセットDBのエイリアス名
 * @param datasetTables データセットテーブル名の配列
 */
export function updateDbObjectSuggestions(
  schemas: DbSchema[],
  datasetAlias: string,
  datasetTables: string[]
): void {
  const items: monaco.languages.CompletionItem[] = [];

  for (const schema of schemas) appendSchemaSuggestions(items, schema);
  appendDatasetSuggestions(items, datasetAlias, datasetTables);

  dbObjectSuggestions = items;
}

/**
 * 処理名: SQL補完プロバイダー登録
 * 処理概要: Monaco Editor の SQL 言語に対して予約語・関数・DBオブジェクトの補完候補を登録する
 * 実装理由: SQLite SQL のオートコンプリートをユーザーに提供するため
 * @returns 補完プロバイダー解除用 Disposable
 */
export function registerSqlCompletionProvider(): monaco.IDisposable {
  return monaco.languages.registerCompletionItemProvider('sql', {
    triggerCharacters: ['\t', '.', '('],

    /**
     * 処理名: 補完候補提供
     * 処理概要: 現在の SQL 補完候補を Monaco へ返す
     * 実装理由: 登録済み候補を都度参照して最新状態を反映するため
      * @param model Monaco テキストモデル
      * @param position カーソル位置
      * @param context 補完コンテキスト
      * @param token キャンセルトークン
     * @returns Monaco 補完リスト
     */
    provideCompletionItems(
      model: monaco.editor.ITextModel,
      position: monaco.Position,
      context: monaco.languages.CompletionContext,
      token: monaco.CancellationToken
    ): monaco.languages.CompletionList {
      void model;
      void position;
      void context;
      void token;
      return provideSqlCompletionItems();
    },
  });
}