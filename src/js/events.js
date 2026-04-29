import { UI_IDS } from './ui/constants.js'; // Updated import path
//import { addResults } from './ui/ResultsSection.js';
import { updateResultsGrid } from './ui/Results.js';
import { setMessages } from './ui/MessagesArea.js';
import { getSqlEditor, setSqlEditorValue } from './ui/QueryArea.js';
import { setupRegisterDatasetHandler } from './ui/ResultsArea.js';
import { setupDatasetUploadHandler, updateDatasetTree } from './ui/Sidebar.js';
import { DATASET_DB_ALIAS, ensureDatasetDatabase } from './datasetDb.js';
// events.js - イベントハンドラーを設定するモジュール

// イベントハンドラーのセットアップ
export const setupEventHandlers = (ui, db, tabManager) => {
  // 現在のデータベースパス
  let currentDbPath = 'Untitled.db';
  // mainノードを非表示にするフラグ
  let mainHidden = false;
  // 表示用スキーマを取得（mainHiddenフラグを考慮）
  const getDisplaySchemas = () => {
    const schemas = db.getAllDatabaseSchemas().filter(schema => schema.alias !== DATASET_DB_ALIAS);
    return mainHidden ? schemas.filter(schema => schema.alias !== 'main') : schemas;
  };
  const refreshTrees = () => {
    ui.updateDatabaseTree(getDisplaySchemas());
    updateDatasetTree(db);
  };

  ensureDatasetDatabase(db);
  updateDatasetTree(db);
  setupRegisterDatasetHandler(ui, db, () => updateDatasetTree(db));
  setupDatasetUploadHandler({
    db,
    showSuccess: ui.showSuccess,
    showError: ui.showError,
    onDatasetChanged: () => updateDatasetTree(db)
  });

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
      results = db.executeQuery(query);
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
    newDbButton.addEventListener('click', async () => {
      const dbPath = await handleNewDatabase(ui, db);
      if (dbPath) currentDbPath = dbPath;
    });
  }

  // "開く"ボタンでファイル選択によるDBインポート（複数ファイル対応）
  const openDbButton = document.getElementById('open-db-button');
  if (openDbButton) {
    openDbButton.addEventListener('click', async () => {
      try {
        const files = await getFiles();
        if (!files || files.length === 0) return;
        const hasExistingDb = currentDbPath !== 'Untitled.db' || mainHidden;
        if (hasExistingDb) {
          // 既に DB を開いている場合は全ファイルをアタッチで追加
          for (const file of files) {
            const data = new Uint8Array(await readFileAsArrayBuffer(file));
            const alias = toAttachAlias(file.name, db);
            try {
              db.attachDatabase(alias, data);
              ui.showSuccess(`'${file.name}' をエイリアス '${alias}' でアタッチしました`);
            } catch (attachErr) {
              ui.showError(`'${file.name}' のアタッチ失敗: ${attachErr.message}`);
            }
          }
        } else {
          // 初回: 1ファイル目をメインDBとして読み込み
          const firstFile = files[0];
          console.log('選択されたDBファイル:', firstFile.name);
          const firstData = new Uint8Array(await readFileAsArrayBuffer(firstFile));
          await db.import(firstData);
          ensureDatasetDatabase(db);
          currentDbPath = firstFile.name;
          mainHidden = false;
          ui.showSuccess(`データベース '${firstFile.name}' を開きました`);
          // 2ファイル目以降をATTACH
          for (let i = 1; i < files.length; i++) {
            const file = files[i];
            const data = new Uint8Array(await readFileAsArrayBuffer(file));
            const alias = toAttachAlias(file.name, db);
            try {
              db.attachDatabase(alias, data);
              ui.showSuccess(`'${file.name}' をエイリアス '${alias}' でアタッチしました`);
            } catch (attachErr) {
              ui.showError(`'${file.name}' のアタッチ失敗: ${attachErr.message}`);
            }
          }
        }
        refreshTrees();
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
      const droppedFiles = Array.from(e.dataTransfer.files).filter(f => /\.db$/i.test(f.name));
      if (droppedFiles.length === 0) return;
      try {
        // 1ファイル目をメインDBとして読み込み
        const firstFile = droppedFiles[0];
        const firstData = new Uint8Array(await readFileAsArrayBuffer(firstFile));
        await db.import(firstData);
        ensureDatasetDatabase(db);
        currentDbPath = firstFile.name;
        mainHidden = false;
        ui.showSuccess(`データベース '${firstFile.name}' を開きました`);
        // 2ファイル目以降をATTACH
        for (let i = 1; i < droppedFiles.length; i++) {
          const file = droppedFiles[i];
          const data = new Uint8Array(await readFileAsArrayBuffer(file));
          const alias = toAttachAlias(file.name, db);
          try {
            db.attachDatabase(alias, data);
            ui.showSuccess(`'${file.name}' をエイリアス '${alias}' でアタッチしました`);
          } catch (attachErr) {
            ui.showError(`'${file.name}' のアタッチ失敗: ${attachErr.message}`);
          }
        }
        refreshTrees();
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
  // サイドバーのデータベースノードクリック（テーブルクリックは Sidebar.js で処理）
  document.addEventListener('click', (event) => {
    const target = event.target.closest('.tree-label');
    if (target && target.textContent.includes('.db') && currentDbPath) {
      // データベースクリック時の処理
      handleDatabaseClick(ui, db, currentDbPath);
    }
  });

  // リフレッシュボタンのハンドラ追加
  const refreshButton = document.getElementById('refresh-db-button');
  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      refreshTrees();
      const dbStatusElem = document.getElementById('db-status');
      if (dbStatusElem) dbStatusElem.textContent = currentDbPath;
    });
  }

  // Detachボタンのイベントハンドラ（委任）
  document.addEventListener('click', async (event) => {
    const detachBtn = event.target.closest('[data-detach-alias]');
    if (!detachBtn) return;
    const alias = detachBtn.dataset.detachAlias;
    try {
      if (alias === 'main') {
        // mainを非表示にしてツリーから消す
        mainHidden = true;
        currentDbPath = 'Untitled.db';
        const dbStatusElem = document.getElementById('db-status');
        if (dbStatusElem) dbStatusElem.textContent = currentDbPath;
        ui.showSuccess('メインデータベースを閉じました');
      } else {
        db.detachDatabase(alias);
        ui.showSuccess(`'${alias}' をデタッチしました`);
      }
      refreshTrees();
    } catch (e) {
      ui.showError(`デタッチ失敗: ${e.message}`);
    }
  });

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
const handleNewDatabase = async (ui, db) => {
  try {
    // ブラウザ環境
    let dbPath = 'new_database.db';
    // 新しいデータベースを作成して接続
    await db.import(null);
    ensureDatasetDatabase(db);

    // サンプルテーブルを作成（複数SQLをそれぞれ実行）
    db.executeQuery(`CREATE TABLE IF NOT EXISTS test (col1 INTEGER PRIMARY KEY, col2 TEXT)`);
    db.executeQuery(`INSERT OR IGNORE INTO test (col1, col2) VALUES (1, '111')`);
    db.executeQuery(`INSERT OR IGNORE INTO test (col1, col2) VALUES (2, '222')`);

    ui.showSuccess(`新しいデータベース '${dbPath}' を作成しました`);

    // データベースツリービューを更新
    const schema = db.getAllDatabaseSchemas();
    ui.updateDatabaseTree(schema.filter(item => item.alias !== DATASET_DB_ALIAS));
    updateDatasetTree(db);

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
    const schemas = db.getAllDatabaseSchemas();
    const dbStatusElem = document.getElementById('db-status');
    if (dbStatusElem) dbStatusElem.textContent = dbPath;
    ui.updateDatabaseTree(schemas.filter(item => item.alias !== DATASET_DB_ALIAS));
    updateDatasetTree(db);
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

const toAttachAlias = (fileName, db) => {
  const baseAlias = fileName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_').replace(/^([0-9])/, '_$1') || 'attached_db';
  let alias = baseAlias;
  let suffix = 1;
  while (alias === DATASET_DB_ALIAS || db.hasAttachedDatabase(alias)) {
    alias = `${baseAlias}_${suffix}`;
    suffix += 1;
  }
  return alias;
};

// ヘルパー: ファイル保存 (DB用)
function saveFile(filename, contents) {
  const blob = new Blob([contents], { type: 'application/sqlite.db' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
// ヘルパー: ファイル選択ダイアログ（単一ファイル）
async function getFile() {
  return new Promise(resolve => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.db';
    input.onchange = () => resolve(input.files[0]); input.click();
  });
}
// ヘルパー: ファイル選択ダイアログ（複数ファイル対応）
async function getFiles() {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.db';
    input.multiple = true;
    input.onchange = () => resolve(Array.from(input.files));
    input.click();
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