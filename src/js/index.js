import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

class SQLiteManager {
  static async initialize() {
    const sqlite3 = await sqlite3InitModule({
      print: console.log,
      printErr: console.error
    });
    return new SQLiteManager(sqlite3);
  }

  constructor(sqlite3) {
    this.sqlite3 = sqlite3;
    const filename = "dbfile_" + (0xffffffff * Math.random() >>> 0);
    this.db = new sqlite3.oo1.DB(filename, "ct");
  }

  exec(sql,bind) {
    const results = [];
    let columnNames = [];
    try {
      this.db.exec({
        sql: sql,
        bind: bind,
        rowMode: 'object',
        callback: (row) => {
          columnNames = Array.from(new Set([...columnNames, ...Object.keys(row)]));
          results.push(Object.values(row));
        }
      });
      return {
        columns: columnNames,
        values: results
      };
    } catch (error) {
      throw error;
    }
  }

  getColumnNames() {
    const stmt = this.db.prepare("SELECT * FROM sqlite_master LIMIT 1");
    try {
      const columnInfo = stmt.getColumnNames();
      return columnInfo;
    } finally {
      stmt.finalize();
    }
  }

  export() {
    const exportedData = this.sqlite3.capi.sqlite3_js_db_export(this.db);
    console.log(exportedData)
    return exportedData;
  }

  async import(contents) {
    this.db.close();
    const vfsName = 'unix'; // 使用するVFSの名前
    const filename = "dbfile_" + (0xffffffff * Math.random() >>> 0);

    this.sqlite3.capi.sqlite3_js_vfs_create_file(vfsName, filename, contents, contents.length); 
    this.db = new this.sqlite3.oo1.DB(filename);
  }

  close() {
    this.db.close();
  }
}

// メインの処理
document.addEventListener("DOMContentLoaded", async function () {
  try {
    // SQLite WAMSの初期化
    window.sqliteManager = await SQLiteManager.initialize();
    console.log("SQLite WAMS initialized");
  } catch (error) {
    console.error("Failed to initialize SQLite WAMS:", error);
  }
});

// execute ボタンのイベントハンドラ
document.getElementById("exec").onclick = function () {
  const sqlStatements = document.getElementById("sql").value.split(';');
  
  sqlStatements.forEach(sql => {
    if (sql.trim()) {
      try {
        console.log(sql);
        addResult('sql    > ' + sql);
        const result = window.sqliteManager.exec(sql);
        console.log(result);
        if (result && result.values.length > 0) {
          addResult('result.columns> ' + result.columns.join(', '));
          result.values.forEach(row => {
            addResult('result.values> ' + row.join(', '));
          });
        }
      } catch (error) {
        console.error(error);
        addResult('error  > ' + error.message);
      }
    }
  });
};

// データエクスポートのイベントハンドラ
document.getElementById("dataexport").onclick = function () {
  const data = window.sqliteManager.export();
  saveFile('Untitled.db', data)
};

// データインポートのイベントハンドラ
document.getElementById("dataimport").onclick = async function () {
  const file = await getFile();
  if (file) {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    try {
      await window.sqliteManager.import(arrayBuffer);
      addResult('Import completed successfully');
    } catch (error) {
      addResult('Import error: ' + error.message);
    }
  }
};

// ヘルパー関数
function addResult(data) {
  const code = document.createElement("li");
  code.textContent = data;
  document.getElementById("output").appendChild(code);
}

function saveFile(filename, contents) {
  const blob = new Blob([contents], { type: 'application/sqlite.db' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function getFile() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = () => {
      resolve(input.files[0]);
    };
    input.click();
  });
}

async function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
