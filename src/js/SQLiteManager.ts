// SQLite モジュールをインポート
import { default as init } from '@sqlite.org/sqlite-wasm';
import * as sourceMapSupport from 'source-map-support';
import path from 'path';
import * as fs from 'fs';
import { splitQuery, sqliteSplitterOptions } from 'dbgate-query-splitter';

//デバッグ用のsourceMap設定
sourceMapSupport.install();

/** sqlite3 WASM ステートメント型 */
interface Sqlite3Stmt {
  getColumnNames: () => string[];
  get: (i: number) => unknown;
  pointer: unknown;
  bind: (...args: unknown[]) => unknown;
  _bind: (...args: unknown[]) => unknown;
  _owner: SQLiteManager;
  getRowAsObject: () => Record<string, unknown>;
  getAsObject: () => Record<string, unknown>;
  step: () => boolean;
  reset: () => void;
  finalize: () => void;
}

/** sqlite3 OO1 DB インスタンス */
interface Sqlite3OoDb {
  prepare: (sql: string) => Sqlite3Stmt;
  exec: (args: { sql: string; bind?: unknown; rowMode?: string; callback?: (row: Record<string, unknown>) => void } | string, bind?: unknown) => Array<{ columns: string[]; values: unknown[][] }>;
  close: () => void;
}

/** sqlite3 WASM CAPI サブセット */
interface Sqlite3Capi {
  sqlite3_js_vfs_create_file: (vfs: string, name: string, data: Uint8Array, size: number) => void;
  sqlite3_js_db_export: (db: Sqlite3OoDb) => Uint8Array;
  sqlite3_bind_parameter_index: (ptr: unknown, name: string) => number;
}

/** sqlite3 OO1 ファクトリー */
interface Sqlite3Oo1 {
  DB: new (filename: string, mode: string) => Sqlite3OoDb;
}

/** sqlite3 WASM インスタンス */
interface Sqlite3Instance {
  capi: Sqlite3Capi;
  oo1: Sqlite3Oo1;
}


/** sqlite3 WASM ステートメント型 */
interface Sqlite3Stmt {
  getColumnNames: () => string[];
  get: (i: number) => unknown;
  pointer: unknown;
  bind: (...args: unknown[]) => unknown;
  _bind: (...args: unknown[]) => unknown;
  _owner: SQLiteManager;
  getRowAsObject: () => Record<string, unknown>;
  getAsObject: () => Record<string, unknown>;
  step: () => boolean;
  reset: () => void;
  finalize: () => void;
}

/** sqlite3 OO1 DB インスタンス */
interface Sqlite3OoDb {
  prepare: (sql: string) => Sqlite3Stmt;
  exec: (args: { sql: string; bind?: unknown; rowMode?: string; callback?: (row: Record<string, unknown>) => void } | string, bind?: unknown) => Array<{ columns: string[]; values: unknown[][] }>;
  close: () => void;
}

/** sqlite3 WASM CAPI サブセット */
interface Sqlite3Capi {
  sqlite3_js_vfs_create_file: (vfs: string, name: string, data: Uint8Array, size: number) => void;
  sqlite3_js_db_export: (db: Sqlite3OoDb) => Uint8Array;
  sqlite3_bind_parameter_index: (ptr: unknown, name: string) => number;
}

/** sqlite3 OO1 ファクトリー */
interface Sqlite3Oo1 {
  DB: new (filename: string, mode: string) => Sqlite3OoDb;
}

/** sqlite3 WASM インスタンス */
interface Sqlite3Instance {
  capi: Sqlite3Capi;
  oo1: Sqlite3Oo1;
}


/**
 * SQLite WASM の初期化、接続管理、クエリ実行を担当するマネージャー。
 */
class SQLiteManager {
  print: (...args: unknown[]) => void;
  printErr: (...args: unknown[]) => void;
  sqlite3: Sqlite3Instance | null;
  original: { db: Partial<Sqlite3OoDb> };
  db: Sqlite3OoDb | null;
  currentFilename: string;
  _attachedFiles: Record<string, string>;

  /**
   * SQLiteManagerインスタンスを初期化して返す。
   * @param data 初期データ（null の場合は空 DB）
   * @param options 初期化オプション
   * @returns 初期化済み SQLiteManager インスタンス
   */
  static async initialize(data: Uint8Array | null, options: Record<string, unknown> = {}) {
    // SQLite モジュールを初期化
    // Ensure global.window is set to simulate browser environment for wasm
    if (typeof window === 'undefined') {
      (global as Record<string, unknown>).window = {};
    }

    // Dynamically import sqlite3 wasm module on first call
    let sqlite3: Sqlite3Instance | null = null;
    if (options.env === 'node' && typeof process !== 'undefined') {
      // Load sqlite3.wasm from dist or pkg output directory
      const isPkg = (process as unknown as Record<string, unknown>).pkg !== undefined;
      const wasmPath = isPkg
        ? path.join(path.dirname(process.execPath), 'sqlite3.wasm')
        : path.join(__dirname, 'sqlite3.wasm');
      const wasmBinary = fs.readFileSync(wasmPath);
      // Initialize wasm module
      sqlite3 = await (init as unknown as (opts: Record<string, unknown>) => Promise<Sqlite3Instance>)({
        print: options.print || (() => { }),
        printErr: options.printErr || (() => { }),
        wasmBinary,
        /**
         * WASMモジュールをインスタンス化するコールバック。
         * @param imports WebAssembly インポートオブジェクト
         * @param successCallback 成功時コールバック
         * @returns インスタンス化結果オブジェクト
         */
        instantiateWasm: (imports: WebAssembly.Imports, successCallback: (instance: WebAssembly.Instance, module: WebAssembly.Module) => void) => {
          WebAssembly.instantiate(wasmBinary, imports)
            .then(({ instance, module }) => successCallback(instance, module));
          return {};
        }
      });
    } else { // ブラウザ環境
      sqlite3 = await (init as unknown as (opts: Record<string, unknown>) => Promise<Sqlite3Instance>)({
        print: options.print || (() => { }),
        printErr: options.printErr || (() => { })
      });
    }

    const sqlite3Instance = new SQLiteManager(sqlite3, options);
    await sqlite3Instance.setupEnvironment(data);
    return sqlite3Instance;
  }

  /**
   * SQLiteManager を構築する。
   * @param sqlite3 sqlite3 WASMモジュール
   * @param options オプション（print, printErr など）
   */
  constructor(sqlite3: Sqlite3Instance, options: Record<string, unknown> = {}) {
    this.print = (options.print as ((...args: unknown[]) => void) | undefined) || (() => { });
    this.printErr = (options.printErr as ((...args: unknown[]) => void) | undefined) || (() => { });
    this.sqlite3 = sqlite3;
    this.original = { db: {} };
    this.db = null;
    this.currentFilename = '';
    this._attachedFiles = {};
  }

  /**
   * SQLite 実行環境を作成し、prepare/exec の拡張を再設定する。
   * @param data 初期化に使うデータベース内容
   * @returns Promise that resolves when setup is complete
   */
  async setupEnvironment(data: Uint8Array | null) {
    // ファイル名生成
    this.currentFilename = 'dbfile_' + ((0xffffffff * Math.random()) >>> 0);
    if (data && data.length) {
      this.sqlite3.capi.sqlite3_js_vfs_create_file('unix', this.currentFilename, data, data.length);
    }
    // データベースを作成
    this.db = new this.sqlite3.oo1.DB(this.currentFilename, 'c');
    // 接続を張り直したら attached 管理も初期化する
    this._attachedFiles = {};
    // sqlite3_instanceにoriginalプロパティを作成
    this.original = { db: {} };
    // 元のprepareメソッドを保存
    this.original.db.prepare = this.db.prepare;
    this.original.db.exec = this.db.exec;

    /**
     * db.prepareをオーバーライドして、SQLiteManagerのカスタマイズを適用
     * @param sql SQL 文字列
     * @returns カスタマイズ済みステートメントオブジェクト
     */
    this.db.prepare = (sql: string) => {
      // 元のprepareメソッドを呼び出し
      const stmt = this.original.db.prepare.call(this.db, sql);

      /**
       * SQLiteManagerのカスタマイズを適用
       */
      const boundGetRowAsObject = this.getRowAsObject.bind(this, stmt);
      stmt.getRowAsObject = boundGetRowAsObject;
      stmt.getAsObject = boundGetRowAsObject;
      stmt._bind = stmt.bind;
      /**
       * SQLite 用の bind を前処理付きで差し替える。
       * @param args バインドする引数
       * @returns バインド結果
       */
      function bindWithPreprocessing(...args: unknown[]) {
        return stmt._owner.bind(stmt, ...args);
      }
      stmt._owner = this;
      stmt.bind = bindWithPreprocessing;
      return stmt;
    };


    /**
     * db.execをオーバーライドして結果を配列形式で返す。
     * @param sql SQL 文字列
     * @param bind バインドパラメータ
     * @returns クエリ実行結果の配列
     */
    this.db.exec = (sql: string, bind?: unknown) => {
      const results: unknown[][] = [];
      let columnNames: string[] = [];
      /**
       * 各行を配列形式で収集する。
       * @param row 取得した 1 行分のデータ
       */
      function collectExecRow(row: Record<string, unknown>) {
        columnNames = Array.from(new Set([...columnNames, ...Object.keys(row)]));
        results.push(Object.values(row));
      }
      this.original.db.exec.call(this.db, {
        sql,
        bind,
        rowMode: 'object',
        callback: collectExecRow,
      });
      return [{ columns: columnNames, values: results }];
    };
  }

  /**
   * 複数文を含む SQL 文字列を文ごとに分割する。
   * @param sql 分割対象の SQL 文字列
   * @returns 分割された SQL 文の配列
   */
  splitStatements(sql: string): string[] {
    // dbgate-query-splitterでSQL文を分割
    return splitQuery(sql, sqliteSplitterOptions) as unknown as string[];
  }

  /**
   * ヘルパーメソッド：行データをオブジェクトとして取得
   * @param stmt SQLite ステートメントオブジェクト
   * @returns 列名をキーとした行データオブジェクト
   */
  getRowAsObject(stmt: Sqlite3Stmt) {
    const obj: Record<string, unknown> = {};
    const columnNames = stmt.getColumnNames();
    for (let i = 0; i < columnNames.length; i++) {
      obj[columnNames[i]] = stmt.get(i);
    }
    return obj;
  }

  /**
   * ヘルパーメソッド：バインドオブジェクトをフィルタリングしてバインドする
   * @param stmt SQLite ステートメントオブジェクト
   * @param bindObject バインドするオブジェクト
   * @returns フィルタリング済みバインドオブジェクト
   */
  filteredBindObject(stmt: Sqlite3Stmt, bindObject: unknown) {
    if (bindObject && typeof bindObject === 'object') {
      const dollarBindObject = Object.fromEntries(
        Object.entries(bindObject).map(([key, value]) => [key.startsWith('$') ? key : `$${key}`, value])
      );
      return Object.fromEntries(
        Object.entries(dollarBindObject).filter(([key]) => this.sqlite3.capi.sqlite3_bind_parameter_index(stmt.pointer, key) !== 0)
      );
    }
    return bindObject;
  }

  /**
   * ステートメントにパラメータをバインドする。
   * @param stmt SQLite ステートメントオブジェクト
   * @param args バインドする引数
   * @returns バインド結果
   */
  bind(stmt: Sqlite3Stmt, ...args: unknown[]) {
    stmt.reset();
    if (args.length === 1 && args[0] && typeof args[0] === 'object') {
      const bindObject = this.filteredBindObject(stmt, args[0]);
      return stmt._bind.apply(stmt, [bindObject]);
    }
    return stmt._bind.apply(stmt, args);
  }

  /**
   * エラーオブジェクトからメッセージ文字列を取得する。
   * @param error エラーオブジェクト
   * @returns エラーメッセージ文字列
   */
  private static toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /**
   * SQL クエリを実行して結果を返す。
   * @param query 実行する SQL クエリ文字列
   * @param bind バインドパラメータ（省略可）
   * @returns クエリ実行結果の配列
   */
  executeQuery(query: string, bind?: unknown) {
    const results: Record<string, unknown>[] = [];
    try {
      const statements = this.splitStatements(query);
      for (const stmtSql of statements) {
        try {
          const [result] = this.db.exec(stmtSql, bind);
          if (result && result.columns && result.columns.length > 0) {
            const resultMap = result.values.map((vals: unknown[]) => Object.fromEntries(result.columns.map((c: string, i: number) => [c, vals[i]])));
            results.push({ success: true, results: resultMap, columns: result.columns });
          } else {
            results.push({ success: true, info: {} });
          }
        } catch (error: unknown) {
          results.push({ success: false, error: SQLiteManager.toErrorMessage(error) });
        }
      }
      return results;
    } catch (error: unknown) {
      results.push({ success: false, error: SQLiteManager.toErrorMessage(error) });
      return results;
    }
  }

  /**
   * エイリアス名バリデーション（SQL インジェクション対策）
   * @param alias 検証するエイリアス名
   * @returns void（不正な場合は例外をスロー）
   */
  static _validateAlias(alias: string) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(alias)) {
      throw new Error(`無効なエイリアス名です: "${alias}" (英数字・アンダースコアのみ、先頭は英字またはアンダースコア)`);
    }
  }

  /**
   * 追加 DB をアタッチする
   * @param {string} alias - スキーマ名（英数字・アンダースコアのみ）
   * @param {Uint8Array|null} data - DB バイナリデータ（null の場合は空 DB を作成）
   * @returns 登録されたエイリアス名
   */
  attachDatabase(alias: string, data: Uint8Array | null) {
    SQLiteManager._validateAlias(alias);
    const filename = `attached_${alias}_${((0xffffffff * Math.random()) >>> 0)}`;
    if (data && data.length) {
      this.sqlite3.capi.sqlite3_js_vfs_create_file('unix', filename, data, data.length);
    }
    this.original.db.exec.call(this.db, { sql: `ATTACH DATABASE '${filename}' AS "${alias}"` });
    this._attachedFiles[alias] = filename;
    return alias;
  }

  /**
   * アタッチ済み DB をデタッチする
   * @param alias デタッチするエイリアス名
   * @returns void
   */
  detachDatabase(alias: string) {
    SQLiteManager._validateAlias(alias);
    this.original.db.exec.call(this.db, { sql: `DETACH DATABASE "${alias}"` });
    delete this._attachedFiles[alias];
  }

  /**
   * PRAGMA database_list の結果を返す
   * @returns アタッチ済み DB 情報の配列
   */
  listAttachedDatabases() {
const result = this.db.exec('PRAGMA database_list');
    if (!result || !result[0]) return [];
    return result[0].values.map((vals: unknown[]) => ({
      seq: vals[0],
      name: vals[1],
      file: vals[2]
    }));
  }

  /**
   * 指定したエイリアスのDBがアタッチされているか確認する
   * @param alias 確認するエイリアス名
   * @returns アタッチ済みの場合 true
   */
  hasAttachedDatabase(alias: string) {
    return this.listAttachedDatabases().some((dbInfo: Record<string, unknown>) => dbInfo.name === alias);
  }

  /**
   * アタッチ済み DB をバイナリとして出力する。
   * @param alias エクスポートするエイリアス名
   * @returns DB バイナリデータ
   */
  exportAttachedDatabase(alias: string) {
    SQLiteManager._validateAlias(alias);
    if (alias === 'main') return this.export();
    const filename = this._attachedFiles[alias];
    if (!filename) {
      throw new Error(`アタッチ済みDBが見つかりません: ${alias}`);
    }
    const attachedDb = new this.sqlite3.oo1.DB(filename, 'c');
    try {
      return this.sqlite3.capi.sqlite3_js_db_export(attachedDb);
    } finally {
      attachedDb.close();
    }
  }

  /**
   * 指定スキーマのオブジェクト一覧を取得する。
   * @param schemaName スキーマ名（デフォルト: main）
   * @returns スキーマ情報オブジェクト
   */
  getDatabaseSchema(schemaName = 'main') {
    const sql = `SELECT type, name FROM "${schemaName}".sqlite_master WHERE type IN ('table','view','index','trigger') ORDER BY type,name`;
    const schema: { alias: string; tables: string[]; views: string[]; indexes: string[]; triggers: string[] } = {
      alias: schemaName,
      tables: [],
      views: [],
      indexes: [],
      triggers: []
    };
    try {
      const [rows] = this.db.exec(sql);
      if (!rows || !rows.values) return schema;
      rows.values.forEach((vals: unknown[]) => {
        const type = vals[0] as string;
        const name = vals[1] as string;
        if (type === 'table') schema.tables.push(name);
        if (type === 'view') schema.views.push(name);
        if (type === 'index') schema.indexes.push(name);
        if (type === 'trigger') schema.triggers.push(name);
      });
    } catch {
      return schema;
    }
    return schema;
  }

  /**
   * 全アタッチ DB（temp を除く）のスキーマ配列を返す
   * @returns スキーマ情報オブジェクトの配列
   */
  getAllDatabaseSchemas() {
    const dbs = this.listAttachedDatabases().filter((d: Record<string, unknown>) => d.name !== 'temp');
    return dbs.map((d: Record<string, unknown>) => this.getDatabaseSchema(d.name as string));
  }

  /**
   * 指定したテーブルの構造を取得する
   * @param tableName テーブル名
   * @returns テーブル構造の配列
   */
  getTableStructure(tableName: string) {
    const sql = `PRAGMA table_info(${tableName})`;
    const [rows] = this.db.exec(sql);
    return rows.values.map((vals: unknown[]) => Object.fromEntries(rows.columns.map((c: string, i: number) => [c, vals[i]])));
  }

  /**
   * 現在開いている main データベースをバイナリとして出力する。
   * @returns DB バイナリデータ
   */
  export() {
    return this.sqlite3.capi.sqlite3_js_db_export(this.db);
  }

  /**
   * 指定データでデータベースを再初期化する。
   * @param contents インポートする DB バイナリデータ
   * @returns 完了を示す Promise
   */
  async import(contents: Uint8Array) {
    this.db.close();
    await this.setupEnvironment(contents);
  }

  /**
   * 現在のデータベース接続を閉じる。
   */
  close() {
    this.db.close();
  }
}

export default SQLiteManager;
