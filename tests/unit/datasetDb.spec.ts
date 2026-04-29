import {
  DATASET_DB_ALIAS,
  formatIdentifier,
  buildSelectAllQuery,
  ensureDatasetDatabase,
  listDatasetTables,
  getDatasetRows,
  resolveDatasetTableName,
  registerRowsAsDatasetTable,
  deleteDatasetTable,
} from '../../src/js/datasetDb';

/**
 * モックDBファクトリ
 * テスト用のダミーDBオブジェクトを生成する
 */
const createMockDb = (tables: string[] = []) => ({
  getDatabaseSchema: jest.fn((_alias: string) => ({ tables })),
  hasAttachedDatabase: jest.fn((_alias: string) => false),
  attachDatabase: jest.fn(),
  exportAttachedDatabase: jest.fn(() => new Uint8Array()),
  db: {
    exec: jest.fn(),
    prepare: jest.fn(() => ({
      bind: jest.fn(),
      step: jest.fn(),
      reset: jest.fn(),
      finalize: jest.fn(),
    })),
  },
});

// ---------------------------------------------------------------------------
// formatIdentifier
// ---------------------------------------------------------------------------
describe('formatIdentifier', () => {
  it('単純な英数字識別子はそのまま返す', () => {
    expect(formatIdentifier('myTable')).toBe('myTable');
  });

  it('アンダースコア始まりはそのまま返す', () => {
    expect(formatIdentifier('_private')).toBe('_private');
  });

  it('スペースを含む識別子はダブルクォートで囲む', () => {
    expect(formatIdentifier('my table')).toBe('"my table"');
  });

  it('数字始まりはダブルクォートで囲む', () => {
    expect(formatIdentifier('1table')).toBe('"1table"');
  });

  it('ダブルクォートを含む場合はエスケープする', () => {
    expect(formatIdentifier('my"table')).toBe('"my""table"');
  });

  it('ハイフンを含む識別子はダブルクォートで囲む', () => {
    expect(formatIdentifier('my-table')).toBe('"my-table"');
  });

  it('ユニコード識別子はそのまま返す', () => {
    expect(formatIdentifier('table_name')).toBe('table_name');
  });
});

// ---------------------------------------------------------------------------
// buildSelectAllQuery
// ---------------------------------------------------------------------------
describe('buildSelectAllQuery', () => {
  it('スキーマが main の場合はテーブル名のみの SQL を返す', () => {
    expect(buildSelectAllQuery('main', 'users')).toBe('SELECT * FROM users LIMIT 100');
  });

  it('スキーマが undefined の場合はテーブル名のみの SQL を返す', () => {
    expect(buildSelectAllQuery(undefined, 'users')).toBe('SELECT * FROM users LIMIT 100');
  });

  it('スキーマが null の場合はテーブル名のみの SQL を返す', () => {
    expect(buildSelectAllQuery(null, 'users')).toBe('SELECT * FROM users LIMIT 100');
  });

  it('スキーマ名を指定した場合は schema.table 形式になる', () => {
    expect(buildSelectAllQuery('dataset', 'orders')).toBe('SELECT * FROM dataset.orders LIMIT 100');
  });

  it('limit パラメータを指定できる', () => {
    expect(buildSelectAllQuery('main', 'users', 50)).toBe('SELECT * FROM users LIMIT 50');
  });

  it('スペースを含むテーブル名はクォートされる', () => {
    expect(buildSelectAllQuery('main', 'my table')).toBe('SELECT * FROM "my table" LIMIT 100');
  });

  it('スキーマとテーブル両方に特殊文字がある場合も正しく処理する', () => {
    const result = buildSelectAllQuery('my-schema', 'my-table', 10);
    expect(result).toBe('SELECT * FROM "my-schema"."my-table" LIMIT 10');
  });
});

// ---------------------------------------------------------------------------
// listDatasetTables
// ---------------------------------------------------------------------------
describe('listDatasetTables', () => {
  it('DB スキーマからテーブル一覧を返す', () => {
    const db = createMockDb(['table1', 'table2']);
    expect(listDatasetTables(db)).toEqual(['table1', 'table2']);
  });

  it('テーブルが undefined の場合は空配列を返す', () => {
    const db = { getDatabaseSchema: jest.fn(() => ({})) };
    expect(listDatasetTables(db)).toEqual([]);
  });

  it('dataset エイリアスで問い合わせる', () => {
    const db = createMockDb([]);
    listDatasetTables(db);
    expect(db.getDatabaseSchema).toHaveBeenCalledWith(DATASET_DB_ALIAS);
  });

  it('空テーブルリストを返す場合は空配列', () => {
    const db = createMockDb([]);
    expect(listDatasetTables(db)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// resolveDatasetTableName
// ---------------------------------------------------------------------------
describe('resolveDatasetTableName', () => {
  it('テーブルが存在しない場合はリクエスト名をそのまま返す', () => {
    const db = createMockDb([]);
    expect(resolveDatasetTableName(db, 'orders')).toBe('orders');
  });

  it('既存テーブル名と衝突する場合はサフィックスを付ける', () => {
    const db = createMockDb(['orders']);
    expect(resolveDatasetTableName(db, 'orders')).toBe('orders_1');
  });

  it('_1 も存在する場合は _2 にする', () => {
    const db = createMockDb(['orders', 'orders_1']);
    expect(resolveDatasetTableName(db, 'orders')).toBe('orders_2');
  });

  it('連続する衝突に対してインクリメントする', () => {
    const db = createMockDb(['orders', 'orders_1', 'orders_2', 'orders_3']);
    expect(resolveDatasetTableName(db, 'orders')).toBe('orders_4');
  });

  it('空文字列の場合はデフォルト名 dataset を使う', () => {
    const db = createMockDb([]);
    expect(resolveDatasetTableName(db, '')).toBe('dataset');
  });

  it('null の場合はデフォルト名 dataset を使う', () => {
    const db = createMockDb([]);
    expect(resolveDatasetTableName(db, null)).toBe('dataset');
  });

  it('スペースのみの場合はデフォルト名 dataset を使う', () => {
    const db = createMockDb([]);
    expect(resolveDatasetTableName(db, '   ')).toBe('dataset');
  });

  it('デフォルト名 dataset が衝突する場合はサフィックスを付ける', () => {
    const db = createMockDb(['dataset']);
    expect(resolveDatasetTableName(db, '')).toBe('dataset_1');
  });
});

// ---------------------------------------------------------------------------
// ensureDatasetDatabase
// ---------------------------------------------------------------------------
describe('ensureDatasetDatabase', () => {
  it('dataset DB が未アタッチの場合は attach して true を返す', () => {
    const db = {
      hasAttachedDatabase: jest.fn(() => false),
      attachDatabase: jest.fn(),
    };
    const result = ensureDatasetDatabase(db);
    expect(result).toBe(true);
    expect(db.attachDatabase).toHaveBeenCalledWith(DATASET_DB_ALIAS, null);
  });

  it('dataset DB が既にアタッチ済みの場合は false を返す', () => {
    const db = {
      hasAttachedDatabase: jest.fn(() => true),
      attachDatabase: jest.fn(),
    };
    const result = ensureDatasetDatabase(db);
    expect(result).toBe(false);
    expect(db.attachDatabase).not.toHaveBeenCalled();
  });

  it('hasAttachedDatabase は dataset エイリアスで呼ばれる', () => {
    const db = {
      hasAttachedDatabase: jest.fn(() => true),
      attachDatabase: jest.fn(),
    };
    ensureDatasetDatabase(db);
    expect(db.hasAttachedDatabase).toHaveBeenCalledWith(DATASET_DB_ALIAS);
  });
});

// ---------------------------------------------------------------------------
// getDatasetRows
// ---------------------------------------------------------------------------
describe('getDatasetRows', () => {
  it('クエリ結果がない場合は空配列を返す', () => {
    const db = { db: { exec: jest.fn(() => []) } };
    expect(getDatasetRows(db, 'orders')).toEqual([]);
  });

  it('クエリ結果がある場合は行オブジェクトの配列を返す', () => {
    const db = {
      db: {
        exec: jest.fn(() => [{
          columns: ['id', 'name'],
          values: [['1', 'Alice'], ['2', 'Bob']],
        }]),
      },
    };
    const result = getDatasetRows(db, 'users');
    expect(result).toEqual([
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
    ]);
  });

  it('生成する SQL に DATASET_DB_ALIAS とテーブル名が含まれる', () => {
    const db = { db: { exec: jest.fn(() => []) } };
    getDatasetRows(db, 'orders');
    const calledSql = (db.db.exec as jest.Mock).mock.calls[0][0] as string;
    expect(calledSql).toContain(DATASET_DB_ALIAS);
    expect(calledSql).toContain('orders');
  });
});

// ---------------------------------------------------------------------------
// registerRowsAsDatasetTable
// ---------------------------------------------------------------------------
describe('registerRowsAsDatasetTable', () => {
  it('columns と rows が両方空の場合は例外を投げる', () => {
    const db = createMockDb([]);
    expect(() => registerRowsAsDatasetTable(db, 'test', [], [])).toThrow('登録できるデータがありません');
  });

  it('columns が空の場合は例外を投げる', () => {
    const db = createMockDb([]);
    expect(() => registerRowsAsDatasetTable(db, 'test', [], [{ a: '1' }])).toThrow();
  });

  it('rows が空の場合は例外を投げる', () => {
    const db = createMockDb([]);
    expect(() => registerRowsAsDatasetTable(db, 'test', ['a'], [])).toThrow();
  });

  it('正常なデータを渡すと登録してテーブル名を返す', () => {
    const mockStmt = {
      bind: jest.fn(),
      step: jest.fn(),
      reset: jest.fn(),
      finalize: jest.fn(),
    };
    const db = {
      hasAttachedDatabase: jest.fn(() => false),
      attachDatabase: jest.fn(),
      getDatabaseSchema: jest.fn(() => ({ tables: [] })),
      db: {
        exec: jest.fn(),
        prepare: jest.fn(() => mockStmt),
      },
    };
    const result = registerRowsAsDatasetTable(
      db,
      'orders',
      ['id', 'name'],
      [{ id: '1', name: 'Alice' }],
    );
    expect(result).toBe('orders');
    expect(db.db.prepare).toHaveBeenCalled();
    expect(mockStmt.finalize).toHaveBeenCalled();
  });

  it('INSERT が複数行に対して呼ばれる', () => {
    const mockStmt = {
      bind: jest.fn(),
      step: jest.fn(),
      reset: jest.fn(),
      finalize: jest.fn(),
    };
    const db = {
      hasAttachedDatabase: jest.fn(() => false),
      attachDatabase: jest.fn(),
      getDatabaseSchema: jest.fn(() => ({ tables: [] })),
      db: {
        exec: jest.fn(),
        prepare: jest.fn(() => mockStmt),
      },
    };
    registerRowsAsDatasetTable(
      db,
      'sales',
      ['id'],
      [{ id: '1' }, { id: '2' }, { id: '3' }],
    );
    expect(mockStmt.step).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// deleteDatasetTable
// ---------------------------------------------------------------------------
describe('deleteDatasetTable', () => {
  it('指定テーブルの DROP TABLE SQL を実行する', () => {
    const db = {
      hasAttachedDatabase: jest.fn(() => true),
      attachDatabase: jest.fn(),
      db: { exec: jest.fn() },
    };
    deleteDatasetTable(db, 'orders');
    const calledSql = (db.db.exec as jest.Mock).mock.calls[0][0] as string;
    expect(calledSql).toContain('DROP TABLE IF EXISTS');
    expect(calledSql).toContain('orders');
  });

  it('SQL に DATASET_DB_ALIAS が含まれる', () => {
    const db = {
      hasAttachedDatabase: jest.fn(() => true),
      attachDatabase: jest.fn(),
      db: { exec: jest.fn() },
    };
    deleteDatasetTable(db, 'myTable');
    const calledSql = (db.db.exec as jest.Mock).mock.calls[0][0] as string;
    expect(calledSql).toContain(DATASET_DB_ALIAS);
  });

  it('特殊文字を含むテーブル名は正しくクォートされる', () => {
    const db = {
      hasAttachedDatabase: jest.fn(() => true),
      attachDatabase: jest.fn(),
      db: { exec: jest.fn() },
    };
    deleteDatasetTable(db, 'my-table');
    const calledSql = (db.db.exec as jest.Mock).mock.calls[0][0] as string;
    expect(calledSql).toContain('"my-table"');
  });
});
