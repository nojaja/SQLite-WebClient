import SQLiteManager from './SQLiteManager.js'

// 入力フィールドとボタンの取得
const inputField = document.getElementById('sql');
const execButton = document.getElementById('execButton');
const resultDiv = document.getElementById('result');

// DOMが読み込まれた後に実行
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // SQLite WAMSの初期化
    window.sqliteManager = await SQLiteManager.initialize();
    log('SQLite WAMS initialized');
    // vec_version() を実行してバージョンを取得
    const [sqlite_version] = window.sqliteManager.db.exec('select sqlite_version();')[0].values;
    log(`sqlite_version=${sqlite_version}`);
    log('SQLite バージョン情報の取得に成功しました。');


    // executeボタンクリックイベントの設定
    execButton.addEventListener('click', async () => {
      const sqlStatements = inputField.value.split(';');
      sqlStatements.forEach(sql => {
        if (sql.trim()) {
          try {
            console.log(sql);
            addResult('sql    > ' + sql);
            const result = window.sqliteManager.db.exec(sql)[0];
            console.log(result);
            if (result && result.values.length > 0) {
              addResult('result.columns> ' + result.columns.join(', '));
              result.values.forEach(row => {
                addResult('result.values> ' + row.join(', '));
              });
            }
          } catch (error) {
            console.error('エラーが発生しました:', error);
            log('エラーが発生しました。'+ error.message);
          }
        }
      });
    });

  } catch (error) {
    console.error('Failed to initialize SQLite WAMS:', error);
  }
});


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
      log('Import completed successfully');
    } catch (error) {
      log('Import error: ' + error.message);
    }
  }
};

// ヘルパー関数
function log(message) {
  console.log(message);
  //resultDiv.textContent = message;
  const div = resultDiv.appendChild(document.createElement('div'));
  div.innerText = message;
  // 結果を表示するための div 要素を作成
  // const div = document.body.appendChild(document.createElement('div'));
  // div.innerText = versionText;
}

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
