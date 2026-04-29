import { UI_IDS } from './ui/constants'; // Updated import path
//import { addResults } from './ui/ResultsSection';
import { updateResultsGrid } from './ui/Results';
import { setMessages } from './ui/MessagesArea';
import { getSqlEditor, setSqlEditorValue } from './ui/QueryArea';
import { setupRegisterDatasetHandler } from './ui/ResultsArea';
import { setupDatasetUploadHandler, updateDatasetTree } from './ui/Sidebar';
import { DATASET_DB_ALIAS, deleteDatasetTable, ensureDatasetDatabase } from './datasetDb';
import SQLiteManager from './SQLiteManager';
// events.js - イベントハンドラーを設定するモジュール

/** クエリ実行結果の型 */
interface QueryResult {
  success: boolean;
  results?: Record<string, unknown>[];
  columns?: string[];
  error?: string;
  info?: { changes?: number };
}

/** UI コントローラーの型 */
interface UiController {
  showError: (msg: string) => void;
  showSuccess: (msg: string) => void;
  updateDatabaseTree: (schemas: { alias: string }[]) => void;
}


/**
 * 処理名: 結果UIクリア
 * 処理概要: 既存のResultsタブとテーブル要素を削除する
 * 実装理由: クエリ実行前に前回の結果を消去するため
 * @param tabs - resultsタブコンテナ
 * @param resultsGrid - resultsグリッドコンテナ
 * @returns void
 */
const clearResultsUI = (tabs: Element, resultsGrid: HTMLElement) => {
  for (const tab of Array.from(tabs.querySelectorAll('.result-tab'))) {
    if (tab.textContent !== 'Messages') tab.remove();
  }
  for (const tbl of Array.from(resultsGrid.children)) {
    if ((tbl as HTMLElement).id.startsWith('results-table')) tbl.remove();
  }
};

/**
 * 処理名: 単一クエリ結果処理
 * 処理概要: クエリ結果1件を処理してメッセージ配列を更新する
 * 実装理由: handleQueryExecution の複雑度を下げるため責務を分離
 * @param result - クエリ実行結果オブジェクト
 * @param idx - 結果インデックス（0始まり）
 * @param resultCount - 全結果件数
 * @param ui - UIオブジェクト
 * @param messages - メッセージ配列（ミューテーション）
 * @returns 結果フラグオブジェクト
 */
const processResultItem = (result: QueryResult, idx: number, resultCount: number, ui: UiController, messages: string[]) => {
  if (result.success && result.results?.length > 0) {
    const tableId = idx === 0 ? 'results-table' : `results-table-${idx + 1}`;
    const tabLabel = resultCount === 1 ? 'Results' : `Results${idx + 1}`;
    try {
      (window as Window & { addResults?: (label: string, id: string) => void }).addResults?.(tabLabel, tableId);
    } catch (error) {
      console.error('Resultsタブの追加エラー:', error);
    }
    updateResultsGrid(result as unknown as { columns: string[]; results: Record<string, unknown>[] }, tableId);
    messages.push(`クエリ${idx + 1}: ${result.results.length} 行の結果`);
    return { hasResult: true, hasSuccess: true };
  }
  if (result.success && !result.results?.length) {
    const msg = `クエリ${idx + 1}を実行しました: ${result.info?.changes || 0} 行に影響`;
    ui.showSuccess(msg);
    messages.push(msg);
    return { hasResult: false, hasSuccess: true };
  }
  const err = `クエリ${idx + 1}エラー: ${result.error}`;
  ui.showError(err);
  messages.push(err);
  return { hasResult: false, hasSuccess: false };
};

/**
 * 処理名: Messagesタブアクティブ化
 * 処理概要: Messagesタブをアクティブにする
 * 実装理由: クエリ結果なし時の表示制御を単一責務の関数に分離
 * @param tabs - resultsタブコンテナ
 */
const activateMessagesTab = (tabs: Element | null) => {
  if (!tabs) return;
  const msgTab = tabs.querySelector('.result-tab:last-child');
  if (!msgTab) return;
  tabs.querySelectorAll('.result-tab').forEach(t => t.classList.remove('active'));
  msgTab.classList.add('active');
};

/**
 * 処理名: 最初のResultsタブアクティブ化
 * 処理概要: 最初のResultsタブをアクティブにしてResultsエリアを表示する
 * 実装理由: クエリ結果あり時の表示制御を単一責務の関数に分離
 * @param tabs - resultsタブコンテナ
 * @param resultsGrid - resultsグリッドコンテナ
 */
const activateFirstResultTab = (tabs: Element, resultsGrid: HTMLElement) => {
  const firstResultTab = Array.from(tabs.querySelectorAll('.result-tab'))
    .find(tab => tab.textContent.trim().startsWith('Results')) as HTMLElement;
  if (!firstResultTab) return;
  tabs.querySelectorAll('.result-tab').forEach(t => t.classList.remove('active'));
  firstResultTab.classList.add('active');
  Array.from(resultsGrid.children).forEach((tbl: Element) => {
    (tbl as HTMLElement).style.display = (tbl as HTMLElement).id === firstResultTab.dataset.resultsId ? '' : 'none';
  });
  const resultsArea = document.getElementById('results-area');
  const messagesArea = document.getElementById('messages-area');
  if (resultsArea) resultsArea.style.display = '';
  if (messagesArea) messagesArea.style.display = 'none';
};

/**
 * 処理名: ファイル群アタッチ
 * 処理概要: 複数ファイルをDBにアタッチする
 * 実装理由: openDbButton/dropハンドラの重複コードを排除するため
 * @param db - SQLiteManager インスタンス
 * @param files - アタッチ対象ファイル配列
 * @param ui - UIオブジェクト
 * @param startIndex - 開始インデックス（デフォルト0）
 * @param toAlias - alias生成関数
 */
const attachFilesToDb = async (db: SQLiteManager, files: File[], ui: UiController, startIndex: number, toAlias: (name: string, db: SQLiteManager) => string) => {
  for (let i = startIndex; i < files.length; i++) {
    const file = files[i];
    const data = new Uint8Array(await readFileAsArrayBuffer(file));
    const alias = toAlias(file.name, db);
    try {
      db.attachDatabase(alias, data);
      ui.showSuccess(`'${file.name}' をエイリアス '${alias}' でアタッチしました`);
    } catch (attachErr: unknown) {
      ui.showError(`'${file.name}' のアタッチ失敗: ${attachErr instanceof Error ? attachErr.message : String(attachErr)}`);
    }
  }
};


/**
 * イベントハンドラーのセットアップ
 * @param ui
 * @param dbOrPromise
 * @param tabManager
 */
export const setupEventHandlers = (ui: UiController, dbOrPromise: SQLiteManager | Promise<SQLiteManager>, tabManager: unknown) => {
  void tabManager;
  // DB参照（Promise または解決済み値を受け取り、遅延初期化をサポート）
  let db: SQLiteManager | null = null;
  const dbReady: Promise<SQLiteManager> = Promise.resolve(dbOrPromise).then(resolved => {
    db = resolved;
    return resolved;
  });

  // 現在のデータベースパス
  let currentDbPath = 'Untitled.db';
  // mainノードを非表示にするフラグ
  let mainHidden = false;
  /**
   * 表示用スキーマを取得（mainHiddenフラグを考慮）
   * @returns 表示対象スキーマの配列
   */
  const getDisplaySchemas = () => {
    if (!db) return [];
    const schemas = db.getAllDatabaseSchemas().filter(schema => schema.alias !== DATASET_DB_ALIAS);
    return mainHidden ? schemas.filter(schema => schema.alias !== 'main') : schemas;
  };
  /**
   * データベースツリーとデータセットツリーを更新する。
   * @returns void
   */
  const refreshTrees = () => {
    ui.updateDatabaseTree(getDisplaySchemas());
    if (db) updateDatasetTree(db);
  };

  // DB準備完了後に初期設定を実行（Promiseが渡された場合は非同期になる）
  dbReady.then(resolvedDb => {
    ensureDatasetDatabase(resolvedDb);
    updateDatasetTree(resolvedDb);
    setupRegisterDatasetHandler(ui, resolvedDb, () => updateDatasetTree(resolvedDb));
    setupDatasetUploadHandler({
      db: resolvedDb,
      showSuccess: ui.showSuccess,
      showError: ui.showError,
      /**
       * データセットツリーを再描画する。
       * @returns void
       */
      onDatasetChanged: () => updateDatasetTree(resolvedDb)
    });
  });

  /**
   * クエリ実行処理 (DBオブジェクトを使用して常に実行)
   * @returns void Promise
   */
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
      clearResultsUI(tabs, resultsGrid);
      const results: QueryResult[] = db.executeQuery(query) as unknown as QueryResult[];
      const messages: string[] = [];
      let anyResult = false;
      let anySuccess = false;
      results.forEach((result: QueryResult, idx: number) => {
        const { hasResult, hasSuccess } = processResultItem(result, idx, results.length, ui, messages);
        if (hasResult) anyResult = true;
        if (hasSuccess) anySuccess = true;
      });
      setMessages(messages);
      if (!anyResult) {
        activateMessagesTab(tabs);
      } else if (anySuccess) {
        activateFirstResultTab(tabs, resultsGrid);
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
        // ファイル選択ダイアログを先に開く（filechooserイベントを即時発火させる）
        // DB初期化完了を待たずにファイル選択UIを起動できるようにする
        const files = await getFiles();
        if (!files || files.length === 0) return;
        // ファイル選択後にDB初期化完了を待機
        await dbReady;
        const hasExistingDb = currentDbPath !== 'Untitled.db' || mainHidden;
        if (hasExistingDb) {
          await attachFilesToDb(db, files, ui, 0, toAttachAlias);
        } else {
          const firstFile = files[0];
          console.log('選択されたDBファイル:', firstFile.name);
          const firstData = new Uint8Array(await readFileAsArrayBuffer(firstFile));
          await db.import(firstData);
          ensureDatasetDatabase(db);
          currentDbPath = firstFile.name;
          mainHidden = false;
          ui.showSuccess(`データベース '${firstFile.name}' を開きました`);
          await attachFilesToDb(db, files, ui, 1, toAttachAlias);
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
    const target = (event.target as HTMLElement | null)?.closest('.tree-label') as HTMLElement | null;
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
    const detachBtn = (event.target as HTMLElement | null)?.closest('[data-detach-alias]') as HTMLElement | null;
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

  // Dataset削除ボタンのイベントハンドラ（委任）
  document.addEventListener('click', (event) => {
    const deleteBtn = (event.target as HTMLElement | null)?.closest('[data-delete-dataset-table]') as HTMLElement | null;
    if (!deleteBtn) return;
    const tableName = deleteBtn.dataset.deleteDatasetTable;
    if (!tableName) return;
    try {
      deleteDatasetTable(db, tableName);
      ui.showSuccess(`データセット「${tableName}」を削除しました`);
      refreshTrees();
    } catch (error) {
      ui.showError(`データセット削除失敗: ${error.message}`);
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

/**
 * 新規データベースを作成する処理
 * @param ui
 * @param db
 * @returns DBパス文字列または null の Promise
 */
const handleNewDatabase = async (ui: UiController, db: SQLiteManager) => {
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

/**
 * データベースクリック時の処理
 * @param ui
 * @param db
 * @param dbPath
 */
const handleDatabaseClick = (ui: UiController, db: SQLiteManager, dbPath: string) => {
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

/**
 * テーブルクリック時の処理
 * @param ui
 * @param db
 * @param dbPath
 * @param tableName
 */
const handleTableClick = (ui: UiController, db: SQLiteManager, dbPath: string, tableName: string) => {
  void db;
  void dbPath;
  try {
    // テーブルのSELECT文をエディタに設定
    const editor = document.getElementById('sql-editor') as HTMLTextAreaElement | null;
    if (editor) {
      editor.value = `SELECT * FROM ${tableName} LIMIT 100`;
    }
  } catch (error) {
    ui.showError(`テーブル情報の取得に失敗しました: ${error.message}`);
  }
};
void handleTableClick;

/**
 *
 * @param fileName
 * @param db
 * @returns 生成されたエイリアス文字列
 */
const toAttachAlias = (fileName: string, db: SQLiteManager) => {
  const baseAlias = fileName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_').replace(/^([0-9])/, '_$1') || 'attached_db';
  let alias = baseAlias;
  let suffix = 1;
  while (alias === DATASET_DB_ALIAS || db.hasAttachedDatabase(alias)) {
    alias = `${baseAlias}_${suffix}`;
    suffix += 1;
  }
  return alias;
};

/**
 * ヘルパー: ファイル保存 (DB用)
 * @param filename
 * @param contents 保存するデータ
 * @returns void
 */
function saveFile(filename, contents) {
  const blob = new Blob([contents], { type: 'application/sqlite.db' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/**
 * ヘルパー: ファイル選択ダイアログ（単一ファイル）
 */
async function getFile(): Promise<File | null> {
  void getFile;
  /**
   * ファイル選択ダイアログを開いて結果を resolve する。
   * @param resolve Promise の resolve 関数
   */
  function openFileDialog(resolve: (file: File | null) => void) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.db';
    /**
     * 単一ファイル選択時に Promise を解決する。
     */
    function handleFileChange() {
      resolve(input.files?.[0] ?? null);
    }
    input.onchange = handleFileChange;
    input.click();
  }

  return new Promise(openFileDialog);
}
void getFile;

/**
 * ヘルパー: ファイル選択ダイアログ（複数ファイル対応）
 */
async function getFiles(): Promise<File[]> {
  /**
   * 複数ファイル選択ダイアログを開いて結果を resolve する。
   * @param resolve Promise の resolve 関数
   */
  function openFilesDialog(resolve: (files: File[]) => void) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.db';
    input.multiple = true;
    /**
     * 複数ファイル選択時に Promise を解決する。
     */
    function handleFilesChange() {
      resolve(Array.from(input.files ?? []));
    }
    input.onchange = handleFilesChange;
    input.click();
  }

  return new Promise(openFilesDialog);
}

/**
 * ヘルパー: ファイルをArrayBufferで読み取り
 * @param file
 */
async function readFileAsArrayBuffer(file: Blob): Promise<ArrayBuffer> {
  /**
   * FileReader でバイナリを読み込む。
   * @param resolve Promise の resolve 関数
   * @param reject Promise の reject 関数
   */
  function loadArrayBuffer(resolve: (buffer: ArrayBuffer) => void, reject: (reason?: unknown) => void) {
    const reader = new FileReader();
    /**
     * バイナリ読み込み成功時に Promise を解決する。
     */
    function handleArrayBufferLoad() {
      resolve(reader.result as ArrayBuffer);
    }
    reader.onload = handleArrayBufferLoad;
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  }

  return new Promise(loadArrayBuffer);
}

/**
 * ヘルパー: ファイル選択ダイアログ (SQL用)
 */
async function getSqlFile(): Promise<File | null> {
  /**
   * SQL ファイル選択ダイアログを開いて結果を resolve する。
   * @param resolve Promise の resolve 関数
   */
  function openSqlFileDialog(resolve: (file: File | null) => void) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.sql';
    /**
     * SQL ファイル選択時に Promise を解決する。
     */
    function handleSqlFileChange() {
      resolve(input.files?.[0] ?? null);
    }
    input.onchange = handleSqlFileChange;
    input.click();
  }

  return new Promise(openSqlFileDialog);
}

/**
 * ヘルパー: ファイルをテキストで読み取り
 * @param file
 */
async function readFileAsText(file: Blob): Promise<string> {
  /**
   * FileReader でテキストを読み込む。
   * @param resolve Promise の resolve 関数
   * @param reject Promise の reject 関数
   */
  function loadText(resolve: (text: string) => void, reject: (reason?: unknown) => void) {
    const reader = new FileReader();
    /**
     * テキスト読み込み成功時に Promise を解決する。
     */
    function handleTextLoad() {
      resolve((reader.result as string) ?? '');
    }
    reader.onload = handleTextLoad;
    reader.onerror = reject;
    reader.readAsText(file);
  }

  return new Promise(loadText);
}

/**
 * ヘルパー: テキストファイル保存
 * @param filename
 * @param contents
 * @param mimeType MIMEタイプ
 * @returns void
 */
function saveTextFile(filename, contents, mimeType = 'text/plain') {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
