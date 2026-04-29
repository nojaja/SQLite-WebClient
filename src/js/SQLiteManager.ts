// SQLite モジュールをインポート
import { default as init } from '@sqlite.org/sqlite-wasm';
import * as sourceMapSupport from 'source-map-support';
import path from 'path';
import * as fs from 'fs';
import { splitQuery, sqliteSplitterOptions } from 'dbgate-query-splitter';

//デバッグ用のsourceMap設定
sourceMapSupport.install();

/**
 *
 */
class SQLiteManager {
  /**
   *
   * @param data
   * @param options
   */
  static async initialize(data, options = {}) {
    // SQLite モジュールを初期化
    // Ensure global.window is set to simulate browser environment for wasm
    if (typeof window === 'undefined') global.window = {};
    // Dynamically import sqlite3 wasm module on first call
    let sqlite3 = null;
    if (options.env === 'node' && typeof process !== 'undefined') { // node.js環境
      // Load sqlite3.wasm from dist or pkg output directory
      const isPkg = process.pkg !== undefined;
      const wasmPath = isPkg
        ? path.join(path.dirname(process.execPath), 'sqlite3.wasm')
        : path.join(__dirname, 'sqlite3.wasm');
        //path.join(process.cwd(), 'dist', 'sqlite3.wasm');
      const wasmBinary = fs.readFileSync(wasmPath);
      // Initialize wasm module
      sqlite3 = await init({
        print: options.print || (() => { }),
        printErr: options.printErr || (() => { }),
        wasmBinary,
        /**
         *
         * @param imports
         * @param successCallback
         */
        instantiateWasm: (imports, successCallback) => {
          WebAssembly.instantiate(wasmBinary, imports)
            .then(({ instance, module }) => successCallback(instance, module));
          return {};
        }
      });
    } else { // ブラウザ環境
        sqlite3 = await init({
            print: options.print || (() => { }),
            printErr: options.printErr || (() => { })
        });
    }

        const sqlite3_instance = new SQLiteManager(sqlite3, options);
        await sqlite3_instance.setupEnvironment(data);
        return sqlite3_instance;
    }

    /**
     *
     * @param sqlite3
     * @param options
     */
    constructor(sqlite3, options = {}) {
        this.print = options.print || (() => { });
        this.printErr = options.printErr || (() => { });
        this.sqlite3 = sqlite3;
        this.original = { db: {} };
        this.db = null;
    }

    /**
     *
     * @param data
     */
    async setupEnvironment(data) {
        // ファイル名生成
        this.currentFilename = "dbfile_" + (0xffffffff * Math.random() >>> 0);
    if (data && data.length) {
            // VFSを使用してデータをインポート
            this.sqlite3.capi.sqlite3_js_vfs_create_file(
                'unix',
                this.currentFilename,
                data,
                data.length
            );
        }
        // データベースを作成
        this.db = new this.sqlite3.oo1.DB(this.currentFilename, "c");
        // 接続を張り直したら attached 管理も初期化する
        this._attachedFiles = {};
        // sqlite3_instanceにoriginalプロパティを作成
        this.original = { db: {} };

        // 元のprepareメソッドを保存
        this.original.db.prepare = this.db.prepare;
        this.original.db.exec = this.db.exec;

        /**
         * db.prepareをオーバーライドして、SQLiteManagerのカスタマイズを適用
         * @param sql
         */
        this.db.prepare = (sql) => {
            // 元のprepareメソッドを呼び出し
            const stmt = this.original.db.prepare.call(this.db, sql);
            
            /**
             * SQLiteManagerのカスタマイズを適用
             */
            stmt.getRowAsObject = () => this.getRowAsObject.call(this, stmt);
            /**
             *
             */
            stmt.getAsObject = () => this.getRowAsObject.call(this, stmt); //sql.js
            stmt._bind = stmt.bind;
            /**
             *
             * @param {...any} args
             */
            stmt.bind = (...args) => {
                return this.bind.apply(this, [stmt, ...args]);
            }

            return stmt;
        };
        
        /**
         * db.execをオーバーライド
         * @param sql
         * @param bind
         */
        this.db.exec = (sql, bind) => {
            const results = [];
            let columnNames = [];
            try {
                this.original.db.exec.call(this.db, {
                    sql: sql,
                    bind: bind,
                    rowMode: 'object',
                    /**
                     *
                     * @param row
                     */
                    callback: (row) => {
                        columnNames = Array.from(new Set([...columnNames, ...Object.keys(row)]));
                        results.push(Object.values(row));
                    }
                });
                return [{
                    columns: columnNames,
                    values: results
                }];
            } catch (error) {
                throw error;
            }
        };
    }

  /**
   *
   * @param sql
   */
  splitStatements(sql) {
    // dbgate-query-splitterでSQL文を分割
    return splitQuery(sql, sqliteSplitterOptions);
  }

    /**
     * ヘルパーメソッド：行データをオブジェクトとして取得
     * @param stmt
     */
    getRowAsObject(stmt) {
        const obj = {};
        const columnNames = stmt.getColumnNames();
        for (let i = 0; i < columnNames.length; i++) {
            obj[columnNames[i]] = stmt.get(i);
        }
        return obj;
    }

    /**
     * ヘルパーメソッド：バインドオブジェクトをフィルタリングしてバインドする
     * @param stmt
     * @param bindObject
     */
    filteredBindObject(stmt, bindObject) {
        if (bindObject && typeof bindObject === 'object') {
            // すべてのキー名を$付きに変換
            const dollarBindObject = Object.fromEntries(
                Object.entries(bindObject).map(([key, value]) => [key.startsWith('$') ? key : `$${key}`, value])
            );
            return Object.fromEntries(
                Object.entries(dollarBindObject).filter(([key, _]) => 0 !== this.sqlite3.capi.sqlite3_bind_parameter_index(stmt.pointer, key))
            );
        } else {
            return bindObject;
        }
    }

    /**
     *
     * @param stmt
     * @param {...any} args
     */
    bind(stmt, ...args) {
        stmt.reset();
        if (args.length === 1 && args[0] && typeof args[0] === 'object') {
            const bindObject = this.filteredBindObject(stmt, args[0]);
            return stmt._bind.apply(stmt, [bindObject]);
        } else {
            return stmt._bind.apply(stmt, ...args);
        }
    }

  /**
   *
   * @param query
   * @param bind
   */
  executeQuery(query, bind) {
    const results = [];
    try {
      const statements = this.splitStatements(query);
      for (const stmtSql of statements) {
    try {
          const [result] = this.db.exec(stmtSql, bind);
          if (result && result.columns && result.columns.length > 0) {
            const resultmap = result.values.map(vals => Object.fromEntries(result.columns.map((c, i) => [c, vals[i]])));
            results.push({ success: true, results: resultmap, columns: result.columns });
      } else {
            results.push({ success: true, info: {} });
          }
        } catch (error) {
          results.push({ success: false, error: error.message });
        }
      }
      return results;
    } catch (error) {
      results.push({ success: false, error: error.message });
      return results;
    }
  }

  /**
   * エイリアス名バリデーション（SQL インジェクション対策）
   * @param alias
   */
  static _validateAlias(alias) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(alias)) {
      throw new Error(`無効なエイリアス名です: "${alias}" (英数字・アンダースコアのみ、先頭は英字またはアンダースコア)`);
    }
  }

  /**
   * 追加 DB をアタッチする
   * @param {string} alias - スキーマ名（英数字・アンダースコアのみ）
   * @param {Uint8Array|null} data - DB バイナリデータ（null の場合は空 DB を作成）
   */
  attachDatabase(alias, data) {
    SQLiteManager._validateAlias(alias);
    const filename = `attached_${alias}_${(0xffffffff * Math.random() >>> 0)}`;
    if (data && data.length) {
      this.sqlite3.capi.sqlite3_js_vfs_create_file('unix', filename, data, data.length);
    }
    this.original.db.exec.call(this.db, { sql: `ATTACH DATABASE '${filename}' AS "${alias}"` });
    if (!this._attachedFiles) this._attachedFiles = {};
    this._attachedFiles[alias] = filename;
    return alias;
  }

  /**
   * アタッチ済み DB をデタッチする
   * @param alias
   */
  detachDatabase(alias) {
    SQLiteManager._validateAlias(alias);
    this.original.db.exec.call(this.db, { sql: `DETACH DATABASE "${alias}"` });
    if (this._attachedFiles) delete this._attachedFiles[alias];
  }

  /** PRAGMA database_list の結果を返す */
  listAttachedDatabases() {
    const result = this.db.exec('PRAGMA database_list');
    if (!result || !result[0]) return [];
    return result[0].values.map(vals => ({
      seq: vals[0],
      name: vals[1],
      file: vals[2]
    }));
  }

  /**
   *
   * @param alias
   */
  hasAttachedDatabase(alias) {
    return this.listAttachedDatabases().some(dbInfo => dbInfo.name === alias);
  }

  /**
   *
   * @param alias
   */
  exportAttachedDatabase(alias) {
    SQLiteManager._validateAlias(alias);
    if (alias === 'main') return this.export();
    const filename = this._attachedFiles && this._attachedFiles[alias];
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
   *
   * @param schemaName
   */
  getDatabaseSchema(schemaName = 'main') {
    const sql = `SELECT type, name FROM "${schemaName}".sqlite_master WHERE type IN ('table','view','index','trigger') ORDER BY type,name`;
    const schema = { alias: schemaName, tables: [], views: [], indexes: [], triggers: [] };
    try {
      const [rows] = this.db.exec(sql);
      if (!rows || !rows.values) return schema;
      rows.values.forEach(vals => {
        const type = vals[0], name = vals[1];
        if (type === 'table') schema.tables.push(name);
        if (type === 'view') schema.views.push(name);
        if (type === 'index') schema.indexes.push(name);
        if (type === 'trigger') schema.triggers.push(name);
      });
    } catch (_) {
      // スキーマ取得失敗時は空を返す
    }
    return schema;
  }

  /** 全アタッチ DB（temp を除く）のスキーマ配列を返す */
  getAllDatabaseSchemas() {
    const dbs = this.listAttachedDatabases().filter(d => d.name !== 'temp');
    return dbs.map(d => this.getDatabaseSchema(d.name));
  }

  /**
   *
   * @param tableName
   */
  getTableStructure(tableName) {
    const sql = `PRAGMA table_info(${tableName})`;
    const [rows] = this.db.exec(sql);
    return rows.values.map(vals => Object.fromEntries(rows.columns.map((c, i) => [c, vals[i]])));
  }
  
    /**
     *
     */
    export() {
    return this.sqlite3.capi.sqlite3_js_db_export(this.db);
    }

    /**
     *
     * @param contents
     */
    async import(contents) {
        this.db.close();
        await this.setupEnvironment(contents);
    }

    /**
     *
     */
    close() {
        this.db.close();
    }
}
export default SQLiteManager;