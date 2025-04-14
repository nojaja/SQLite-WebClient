// SQLite モジュールをインポート
import { default as init } from "sql.js";

class SQLiteManager {
    static async initialize() {
        // SQLite モジュールを初期化
        const sqlite3 = await init({
            // Required to load the wasm binary asynchronously. Of course, you can host it wherever you want
            // You can omit locateFile completely when running in node
            //locateFile: file => `https://sql.js.org/dist/${file}`
            //locateFile: filename => `/dist/${filename}`
            locateFile: file => './sql-wasm.wasm',
            print: console.log,
            printErr: console.error
        });
        return new SQLiteManager(sqlite3);
    }

    constructor(sqlite3) {
        this.sqlite3 = sqlite3;
        // データベースを作成
        this.db = new sqlite3.Database();
    }

    exec(sql, bind) {
        return this.db.exec(sql);
    }

    export() {
        const exportedData = this.db.export();
        return exportedData;
    }

    async import(contents) {
        this.db.close();
        this.db = new this.sqlite3.Database(contents);
    }

    close() {
        this.db.close();
    }
}
export default SQLiteManager