import initSqlJs from "sql.js";

class SQLiteManager {
  static async initialize() {
    const config = {
      // Required to load the wasm binary asynchronously. Of course, you can host it wherever you want
      // You can omit locateFile completely when running in node
      //locateFile: file => `https://sql.js.org/dist/${file}`
      //locateFile: filename => `/dist/${filename}`
      locateFile: file => './sql-wasm.wasm'
    }
    const sqlite3 = await initSqlJs(config);
    return new SQLiteManager(sqlite3);
  }

  constructor(sqlite3) {
    this.sqlite3 = sqlite3;
    this.db = new sqlite3.Database();
  }

  exec(sql) {
    console.log(this.db)
    return this.db.exec(sql);
  }

  export() {
    return this.db.export();
  }

  async import(contents) {
    this.db.close();
    this.db = new this.sqlite3.Database(contents);
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
  const sqlStatements = document.getElementById("sql").value.split(";");

  sqlStatements.forEach(sql => {
    if (sql.trim()) {
      try {
        console.log(sql);
        addResult('sql    > ' + sql);
        const result = window.sqliteManager.exec(sql);
        console.log(result);
        result.forEach(result => {
          console.log(result);
          if (result.columns) {
            addResult('result.columns> ' + result.columns.join(', '));
          }
          result.values.forEach(row => {
            addResult('result.values> ' + row.join(', '));
          });
        });
      } catch (error) {
        console.log(error);
        addResult('error > ' + error.message);
      }
    }
  });
}

// データエクスポートのイベントハンドラ
document.getElementById("dataexport").onclick = function () {
  const data = window.sqliteManager.export();
  saveFile('Untitled.db', data)
}

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
}

// ヘルパー関数
function addResult(data) {
  const code = document.createElement("li");
  code.textContent = data;
  document.getElementById("output").appendChild(code);
}

/**
 * Saves a file by creating a downloadable instance, and clicking on the
 * download link.
 *
 * @param {string} filename Filename to save the file as.
 * @param {arrayBuffer} contents Contents of the file to save.
 */
function saveFile(filename, contents) {
  const blob = new Blob([contents], { type: 'application/sqlite.db' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};


/**
 * Uses the <input type="file"> to open a new file
 *
 * @return {!Promise<File>} File selected by the user.
 */
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

/**
 * Reads the raw text from a file.
 *
 * @private
 * @param {File} file
 * @return {Promise<string>} A promise that resolves to the parsed string.
 */
async function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}


