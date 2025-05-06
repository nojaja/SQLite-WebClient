import { UI_IDS } from './ui/constants.js'; // Updated import path
//import { addResults } from './ui/ResultsSection.js';
import { updateResultsGrid } from './ui/Results.js';
import { setMessages } from './ui/MessagesArea.js';
import { getSqlEditor, setSqlEditorValue } from './ui/QueryArea.js';
// events.js - イベントハンドラーを設定するモジュール

// イベントハンドラーのセットアップ
export const setupEventHandlers = (ui, db, tabManager) => {
  // 現在のデータベースパス
  let currentDbPath = 'Untitled.db';

  // クエリ実行処理 (DBオブジェクトを使用して常に実行)
  const handleQueryExecution = async () => {
    try {
      const editor = getSqlEditor();
      if (!editor) throw new Error('SQLエディタが見つかりません');

      const query = editor.value.trim();
      if (!query) {
        const msg = '実行するクエリを入力してください';
        ui.showError(msg);
        setMessages(msg);
        return;
      }
      // 実行エンジンの選択値取得
      const activeQueryArea = editor.closest('.query-area');
      let refRows = null;
      let refDatasetName = '';
      let engine = 'SQL';
      if (activeQueryArea) {
        const refSelect = activeQueryArea.querySelector('.ref-dataset-select');
        if (refSelect && refSelect.value) {
          const dsStore = window.__DATASET_STORE__ || {};
          const ds = dsStore[refSelect.value];
          if (ds && Array.isArray(ds.rows)) {
            refRows = ds.rows;
            refDatasetName = refSelect.value;
          }
        }
        const engineSelect = activeQueryArea.querySelector('.engine-select');
        if (engineSelect && engineSelect.value) {
          engine = engineSelect.value;
        }
      }

      // 既存のResultsタブ・テーブルを全てクリア（Messages以外）
      const tabs = document.querySelector('.results-tabs');
      const resultsGrid = document.getElementById(UI_IDS.RESULTS_GRID);
      // 先に全て削除
      for (const tab of Array.from(tabs.querySelectorAll('.result-tab'))) {
        if (tab.textContent !== 'Messages') tab.remove();
      }
      for (const tbl of Array.from(resultsGrid.children)) {
        if (tbl.id.startsWith('results-table')) tbl.remove();
      }
      let results = [];
      let messages = [];
      let hasResults = false;
      let anySuccess = false;
      let anyResult = false;
      if (engine === 'jsonata') {
        // jsonata実行
        if (!refDatasetName || !refRows) {
          const msg = 'jsonata実行には参照データセットの選択が必要です';
          ui.showError(msg);
          setMessages(msg);
          return;
        }
        try {
          const jsonata = (await import('jsonata')).default;
          const expr = jsonata(query);
          const jsonataResult = await expr.evaluate(refRows);
          // 結果をテーブル形式に整形
          let columns = [];
          let rows = [];
          if (Array.isArray(jsonataResult)) {
            if (jsonataResult.length > 0 && typeof jsonataResult[0] === 'object' && !Array.isArray(jsonataResult[0])) {
              columns = Object.keys(jsonataResult[0]);
              rows = jsonataResult;
            } else {
              columns = ['value'];
              rows = jsonataResult.map(v => ({ value: v }));
            }
          } else if (typeof jsonataResult === 'object' && jsonataResult !== null) {
            columns = Object.keys(jsonataResult);
            rows = [jsonataResult];
          } else {
            columns = ['value'];
            rows = [{ value: jsonataResult }];
          }
          results = [{ success: true, results: rows, columns }];
          messages.push('jsonata式を実行しました');
        } catch (err) {
          results = [{ success: false, error: err.message }];
          messages.push('jsonata実行エラー: ' + err.message);
        }
      } else {
        // ...既存のSQL実行処理...
        if (refRows && refRows.length > 0) {
          // データセットの各rowでprepare/bind/stepを繰り返し実行
          const resultsArr = [];
          const stmt = db.db.prepare(query);
          for (const row of refRows) {
            const dollarRow = Object.fromEntries(
              Object.entries(row).map(([k, v]) => [k.startsWith('$') ? k : `$${k}`, v])
            );
            stmt.bind(dollarRow);
          // SELECTかどうかで処理分岐
            if (/^\s*select/i.test(query)) {
              while (stmt.step()) {
                resultsArr.push(stmt.getAsObject());
              }
            } else {
              stmt.step(); // INSERT/UPDATE/DELETE等
            }
            stmt.reset();
          }
          stmt.finalize();
          if (/^\s*select/i.test(query)) {
            results = [{ success: true, results: resultsArr, columns: resultsArr.length > 0 ? Object.keys(resultsArr[0]) : [] }];
          } else {
            results = [{ success: true, info: {} }];
          }
        } else {
          // 通常通り1回だけ実行
          results = db.executeQuery(query);
        }
      }
      // ...既存の結果表示処理...
      let idx = 0;
      for (const result of results) {
        // 結果がある場合のみResultsタブを生成
        if (result.success && result.results && result.results.length > 0) {
          const tableId = idx === 0 ? 'results-table' : `results-table-${idx+1}`;
          const tabLabel = results.length === 1 ? 'Results' : `Results${idx+1}`;
          try {
            addResults(tabLabel, tableId);
            
          } catch (error) {
            console.error('Resultsタブの追加エラー:', error);
          }
          updateResultsGrid(result, tableId);
          anySuccess = true;
          anyResult = true;
          messages.push(`クエリ${idx+1}: ${result.results.length} 行の結果`);
        }
        if (result.success && (!result.results || result.results.length === 0)) {
          const msg = `クエリ${idx+1}を実行しました: ${result.info?.changes || 0} 行に影響`;
          ui.showSuccess(msg);
          messages.push(msg);
        } else if (!result.success) {
          const err = `クエリ${idx+1}エラー: ${result.error}`;
          ui.showError(err);
          messages.push(err);
        }
        idx++;
      }
      // Messagesタブにログ・エラーを表示
      setMessages(messages);
      // 結果が無い場合はMessagesタブのみアクティブ・Resultsタブは生成しない
      if (!anyResult) {
        const tabs = document.querySelector('.results-tabs');
        const msgTab = tabs && tabs.querySelector('.result-tab:last-child');
        if (msgTab) {
          tabs.querySelectorAll('.result-tab').forEach(t => t.classList.remove('active'));
          msgTab.classList.add('active');
        }
      } else if (anySuccess) {
        // 最初のResultタブをアクティブに
        const tabs = document.querySelector('.results-tabs');
        const resultsGrid = document.getElementById(UI_IDS.RESULTS_GRID);
        // 先頭のResults系タブをアクティブに
        const firstResultTab = Array.from(tabs.querySelectorAll('.result-tab'))
          .find(tab => tab.textContent.trim().startsWith('Results'));
        if (firstResultTab) {
          tabs.querySelectorAll('.result-tab').forEach(t => t.classList.remove('active'));
          firstResultTab.classList.add('active');
          Array.from(resultsGrid.children).forEach(tbl => {
            tbl.style.display = (tbl.id === firstResultTab.dataset.resultsId) ? '' : 'none';
          });
          // Resultsエリア表示
          const resultsArea = document.getElementById('results-area');
          const messagesArea = document.getElementById('messages-area');
          if (resultsArea) resultsArea.style.display = '';
          if (messagesArea) messagesArea.style.display = 'none';
        }
      }
    } catch (error) {
      const msg = `クエリ実行中にエラーが発生しました: ${error.message}`;
      ui.showError(msg);
      setMessages(msg);
      console.error('クエリ実行エラー:', error);
    }
  };

  // 新規データベース作成ボタン
  const newDbButton = document.getElementById('new-db-button');
  if (newDbButton) {
    newDbButton.addEventListener('click', () => {
      const dbPath = handleNewDatabase(ui, db);
      if (dbPath) currentDbPath = dbPath;
    });
  }

  // "開く"ボタンでファイル選択によるDBインポート
  const openDbButton = document.getElementById('open-db-button');
  if (openDbButton) {
    openDbButton.addEventListener('click', async () => {
      try {
        const dbPath = await getFile();
        if (!dbPath) return;
        console.log('選択されたDBファイル:', dbPath.name);
        const arrayBuffer = await readFileAsArrayBuffer(dbPath);
        const data = new Uint8Array(arrayBuffer);
        await db.import(data);
        ui.showSuccess(`データベース '${dbPath.name}' を開きました`);
        currentDbPath = dbPath.name;
        const schema = db.getDatabaseSchema(currentDbPath);
        ui.updateDatabaseTree(schema);
        const dbStatusElem = document.getElementById('db-status');
        if (dbStatusElem) dbStatusElem.textContent = currentDbPath;
      } catch (error) {
        ui.showError('インポートエラー: ' + error.message);
      }
    });
  }
  // "保存"ボタンでDBエクスポート
  const saveButton = document.getElementById('save-db-button');
  if (saveButton) {
    saveButton.addEventListener('click', async () => {
      try {
        const data = await db.export();
        saveFile('exported.db', data);
        ui.showSuccess('データベースをエクスポートしました');
      } catch (error) {
        ui.showError('エクスポートエラー: ' + error.message);
      }
    });
  }
  // ツリービューへのファイルドロップでインポート
  const treeViewElem = document.getElementById(UI_IDS.DB_TREE);
  if (treeViewElem) {
    treeViewElem.addEventListener('dragover', e => e.preventDefault());
    treeViewElem.addEventListener('drop', async e => {
      e.preventDefault();
      const dbPath = e.dataTransfer.files[0];
      if (!dbPath) return;
      try {
        const arrayBuffer = await readFileAsArrayBuffer(dbPath);
        const data = new Uint8Array(arrayBuffer);
        await db.import(data);
        ui.showSuccess(`データベース '${dbPath}' を開きました`);
        currentDbPath = dbPath.name;
        const schema = db.getDatabaseSchema(currentDbPath);
        ui.updateDatabaseTree(schema);
        const dbStatusElem = document.getElementById('db-status');
        if (dbStatusElem) dbStatusElem.textContent = currentDbPath;
      } catch (error) {
        ui.showError('インポートエラー: ' + error.message);
      }
    });
  }

  // クエリ実行ボタン
  const runButton = document.getElementById('run-button');
  if (runButton) {
    runButton.addEventListener('click', handleQueryExecution);
  }
  // サイドバーのテーブル選択やランイベントは既存のまま
  document.addEventListener('click', (event) => {
    const target = event.target.closest('.tree-label');
    if (target && target.textContent.includes('.db') && currentDbPath) {
      // データベースクリック時の処理
      handleDatabaseClick(ui, db, currentDbPath);
    } else if (target && target.closest('.Tables')) {
      // テーブルクリック時の処理 (currentDbPath が未設定でもデフォルトDBを使用)
      const dbPath = currentDbPath || 'sample_database';
      // currentDbPath を更新し、クエリ設定のみ行う
      currentDbPath = dbPath;
      handleTableClick(ui, db, dbPath, target.dataset.name);
    }
  });

  // リフレッシュボタンのハンドラ追加
  const refreshButton = document.getElementById('refresh-db-button');
  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      // currentDbPath に関わらずツリービューを更新
      handleDatabaseClick(ui, db, currentDbPath);
    });
  }

  // "Queryを開く"ボタン
  const openQueryButton = document.getElementById('open-query-button');
  if (openQueryButton) {
    openQueryButton.addEventListener('click', async () => {
      try {
        const sqlFile = await getSqlFile();
        if (!sqlFile) return;
        console.log('選択されたSQLファイル:', sqlFile.name);
        const sqlContent = await readFileAsText(sqlFile);
        setSqlEditorValue(sqlContent);
        ui.showSuccess(`SQLファイル '${sqlFile.name}' を読み込みました`);
      } catch (error) {
        ui.showError(`SQLファイル読み込みエラー: ${error.message}`);
        console.error('SQLファイル読み込みエラー:', error);
      }
    });
  }

  // "Queryを保存"ボタン
  const saveQueryButton = document.getElementById('save-query-button');
  if (saveQueryButton) {
    saveQueryButton.addEventListener('click', () => {
      try {
        const editor = getSqlEditor();
        if (!editor) throw new Error('SQLエディタが見つかりません');

        const query = editor.value;
        if (!query.trim()) {
          ui.showError('保存するSQLクエリがありません');
          return;
        }

        saveTextFile('query.sql', query, 'application/sql');
        ui.showSuccess('クエリを query.sql として保存しました');
      } catch (error) {
        ui.showError(`クエリ保存エラー: ${error.message}`);
        console.error('クエリ保存エラー:', error);
      }
    });
  }
};

// 新規データベースを作成する処理
const handleNewDatabase = (ui, db) => {
  try {
    // ブラウザ環境
    let dbPath = 'new_database.db';
    // 新しいデータベースを作成して接続
    db.import(null);

    // サンプルテーブルを作成（複数SQLをそれぞれ実行）
    db.executeQuery(`CREATE TABLE IF NOT EXISTS test (col1 INTEGER PRIMARY KEY, col2 TEXT)`);
    db.executeQuery(`INSERT OR IGNORE INTO test (col1, col2) VALUES (1, '111')`);
    db.executeQuery(`INSERT OR IGNORE INTO test (col1, col2) VALUES (2, '222')`);

    ui.showSuccess(`新しいデータベース '${dbPath}' を作成しました`);

    // データベースツリービューを更新
    const schema = db.getDatabaseSchema(dbPath);
    ui.updateDatabaseTree(schema);

    const dbStatusElem = document.getElementById('db-status');
    if (dbStatusElem) {
      dbStatusElem.textContent = dbPath;
    }

    return dbPath;
  } catch (error) {
    ui.showError(`データベース作成エラー: ${error.message}`);
    console.error('データベース作成エラー:', error);
    return null;
  }
};

// データベースクリック時の処理
const handleDatabaseClick = (ui, db, dbPath) => {
  try {
    // データベーススキーマ情報を取得
    const schema = db.getDatabaseSchema(dbPath);
    const dbStatusElem = document.getElementById('db-status');
    if (dbStatusElem) dbStatusElem.textContent = dbPath;
    ui.updateDatabaseTree(schema);
  } catch (error) {
    ui.showError(`データベース情報の取得に失敗しました: ${error.message}`);
  }
};

// テーブルクリック時の処理
const handleTableClick = (ui, db, dbPath, tableName) => {
  try {
    // テーブルのSELECT文をエディタに設定
    const editor = document.getElementById('sql-editor');
    if (editor) {
      editor.value = `SELECT * FROM ${tableName} LIMIT 100`;
    }
  } catch (error) {
    ui.showError(`テーブル情報の取得に失敗しました: ${error.message}`);
  }
};

// ヘルパー: ファイル保存 (DB用)
function saveFile(filename, contents) {
  const blob = new Blob([contents], { type: 'application/sqlite.db' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
// ヘルパー: ファイル選択ダイアログ
async function getFile() {
  return new Promise(resolve => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.db';
    input.onchange = () => resolve(input.files[0]); input.click();
  });
}
// ヘルパー: ファイルをArrayBufferで読み取り
async function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result);
    reader.onerror = reject; reader.readAsArrayBuffer(file);
  });
}
// ヘルパー: ファイル選択ダイアログ (SQL用)
async function getSqlFile() {
  return new Promise(resolve => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.sql';
    input.onchange = () => resolve(input.files[0]); input.click();
  });
}
// ヘルパー: ファイルをテキストで読み取り
async function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result);
    reader.onerror = reject; reader.readAsText(file);
  });
}
// ヘルパー: テキストファイル保存
function saveTextFile(filename, contents, mimeType = 'text/plain') {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}