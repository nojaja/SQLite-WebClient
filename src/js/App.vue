<template>
    <div id="app-container" class="app-container">
        <MenuBar
            @open-help="showHelpModal = true"
            @new-db="handleNewDb"
            @open-db="handleOpenDb"
            @save-db="handleSaveDb"
            @new-query="handleNewQuery"
            @open-query="handleOpenQuery"
            @save-query="handleSaveQuery"
            @run-query="handleRunQuery"
        />
        <div class="main-layout">
            <Sidebar
                ref="sidebarRef"
                @refresh-db="handleRefreshDb"
                @detach-db="handleDetachDb"
                @add-dataset="handleAddDataset"
                @delete-dataset="handleDeleteDataset"
                @drop-files="handleDbTreeDrop"
                @set-query="handleSetQuery"
                @show-ddl="handleShowDdl"
            />
            <div class="splitter" ref="splitterEl"></div>
            <MainArea
                ref="mainAreaRef"
                @register-dataset="handleRegisterDataset"
                @download-csv="handleDownloadCsv"
            />
        </div>
        <StatusBar ref="statusBarRef" />
        <!-- ファイル選択用隠しinput（file picker をVueテンプレートで管理） -->
        <input type="file" ref="fileInputRef" style="display:none" @change="onFileInputChange" />
        <!-- CSVダウンロード用隠しアンカー -->
        <a ref="downloadLinkRef" style="display:none" aria-hidden="true"></a>
    </div>

    <!-- ヘルプモーダル -->
    <Teleport to="body">
        <div id="help-modal" :style="{ display: showHelpModal ? '' : 'none' }">
            <div class="modal-overlay" @click="showHelpModal = false"></div>
            <div class="modal-content">
                <h2>Help and License</h2>
                <ul>
                    <li><a href="https://github.com/nojaja/SQLite-WebClient" target="_blank">GitHub Repository</a></li>
                </ul>
                <h3>Used Libraries and Licenses</h3>
                <ul>
                    <li><a href="https://www.npmjs.com/package/@sqlite.org/sqlite-wasm" target="_blank">@sqlite.org/sqlite-wasm</a> (Apache-2.0)</li>
                    <li><a href="https://www.npmjs.com/package/datatables.net-vue3" target="_blank">DataTables (Vue3)</a> (MIT)</li>
                    <li><a href="https://www.npmjs.com/package/dbgate-query-splitter" target="_blank">dbgate-query-splitter</a> (MIT)</li>
                </ul>
                <button @click="showHelpModal = false">閉じる</button>
            </div>
        </div>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import MenuBar from './components/MenuBar.vue';
import Sidebar from './components/Sidebar.vue';
import MainArea from './components/MainArea.vue';
import StatusBar from './components/StatusBar.vue';
import { useColumnSplitter } from './composables/useColumnSplitter';
import {
    DATASET_DB_ALIAS,
    deleteDatasetTable,
    ensureDatasetDatabase,
    listDatasetTables,
    importCsvFileAsDataset,
    registerRowsAsDatasetTable,
} from './datasetDb';
import SQLiteManager from './SQLiteManager';

// ---- Vueコンポーネント ref ----
const splitterEl = ref<HTMLElement | null>(null);
const sidebarRef = ref<InstanceType<typeof Sidebar> | null>(null);
const mainAreaRef = ref<InstanceType<typeof MainArea> | null>(null);
const statusBarRef = ref<InstanceType<typeof StatusBar> | null>(null);
const showHelpModal = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);
const downloadLinkRef = ref<HTMLAnchorElement | null>(null);

// ---- DB状態 ----
let db: SQLiteManager | null = null;
let dbReady: Promise<SQLiteManager> | null = null;
let currentDbPath = 'Untitled.db';
let mainHidden = false;
let queryExecutionSerial = 0;

/**
 * 処理名: DB インスタンス取得
 * 処理概要: 初期化済みの SQLiteManager インスタンスを返す
 * 実装理由: 未初期化時は reject し呼び出し元でエラーを捕捉できるようにするため
 * @returns SQLiteManager の Promise
 */
const getDb = (): Promise<SQLiteManager> => {
    if (dbReady) return dbReady;
    return Promise.reject(new Error('DB未初期化'));
};

// ---- UIヘルパー ----
/**
 * 処理名: エラー表示
 * 処理概要: ステータスバーにエラーメッセージを表示する
 * 実装理由: アプリ全体のエラー通知を一元化するため
 * @param msg エラーメッセージ
 * @returns void
 */
const showError = (msg: string) => statusBarRef.value?.showError(msg);
/**
 * 処理名: 成功表示
 * 処理概要: ステータスバーに成功メッセージを表示する
 * 実装理由: アプリ全体の成功通知を一元化するため
 * @param msg 成功メッセージ
 * @returns void
 */
const showSuccess = (msg: string) => statusBarRef.value?.showSuccess(msg);
/**
 * 処理名: DB 名設定
 * 処理概要: 現在の DB パスを更新しステータスバーに反映する
 * 実装理由: DB 変更時にパスとステータス表示を同期するため
 * @param name データベース名（パス）
 */
const setDbStatus = (name: string) => {
    currentDbPath = name;
    statusBarRef.value?.setDbName(name);
};

/**
 * 処理名: 表示用スキーマ取得
 * 処理概要: dataset DB と mainHidden フラグを除外したスキーマ一覧を返す
 * 実装理由: サイドバーの DB ツリー表示に不要なスキーマを隠すため
 * @param dbInst SQLiteManager インスタンス
 * @returns 表示対象のスキーマ配列
 */
const getDisplaySchemas = (dbInst: SQLiteManager) => {
    const schemas = dbInst.getAllDatabaseSchemas().filter(s => s.alias !== DATASET_DB_ALIAS);
    return mainHidden ? schemas.filter(s => s.alias !== 'main') : schemas;
};

/**
 * 処理名: ツリー再描画
 * 処理概要: DB ツリーとデータセットツリーを最新状態で再描画する
 * 実装理由: DB 変更後に常に同一手順でサイドバーを更新するため
 */
const refreshTrees = async () => {
    try {
        const dbInst = await getDb();
        sidebarRef.value?.updateDatabaseTree(getDisplaySchemas(dbInst));
        sidebarRef.value?.updateDatasetTree(listDatasetTables(dbInst));
    } catch { /* DB未初期化時は何もしない */ }
};

// ---- ファイルI/Oヘルパー ----
/**
 * 処理名: ファイル ArrayBuffer 読み込み
 * 処理概要: Blob を ArrayBuffer として非同期で読み込む
 * 実装理由: SQLite ファイルをバイナリデータとして取得するため
 * @param file 読み込む Blob
 * @returns ArrayBuffer の Promise
 */
const readFileAsArrayBuffer = (file: Blob): Promise<ArrayBuffer> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        /**
         * 処理名: 読み込み完了ハンドラ
         * 処理概要: ファイル読み込み完了時に ArrayBuffer を resolve に渡す
         * 実装理由: FileReader の非同期完了を Promise に変換するため
         * @returns void
         */
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });

/**
 * 処理名: ファイルテキスト読み込み
 * 処理概要: Blob をテキスト文字列として非同期で読み込む
 * 実装理由: SQL ファイルをテキストとして取得するため
 * @param file 読み込む Blob
 * @returns テキスト文字列の Promise
 */
const readFileAsText = (file: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        /**
         * 処理名: 読み込み完了ハンドラ
         * 処理概要: ファイル読み込み完了時にテキスト文字列を resolve に渡す
         * 実装理由: FileReader の非同期完了を Promise に変換するため
         * @returns void
         */
        reader.onload = () => resolve((reader.result as string) ?? '');
        reader.onerror = reject;
        reader.readAsText(file);
    });

let filePickerResolve: ((files: File[]) => void) | null = null;
/**
 * 処理名: ファイル入力変更ハンドラ
 * 処理概要: 隠し入力要素の変更イベントを捕捉し resolve コールバックにファイル一覧を渡す
 * 実装理由: ブラウザのファイル選択ダイアログを Promise 尖岡化するため
 */
const onFileInputChange = () => {
    if (filePickerResolve && fileInputRef.value) {
        filePickerResolve(Array.from(fileInputRef.value.files ?? []));
        filePickerResolve = null;
    }
};

/**
 * 処理名: ファイル選択
 * 処理概要: 隠し入力要素を活性化しファイル選択ダイアログを表示する
 * 実装理由: ファイル選択を Promise 尖岡化しイベント橋渡しを回避するため
 * @param accept 指定ファイル種別（例: '.db'）
 * @param multiple 複数選択を許可するか（デフォルト: false）
 * @returns 選択した File 配列の Promise
 */
const pickFiles = (accept: string, multiple = false): Promise<File[]> =>
    new Promise(resolve => {
        const input = fileInputRef.value;
        if (!input) return resolve([]);
        input.accept = accept;
        input.multiple = multiple;
        input.value = '';
        filePickerResolve = resolve;
        input.click();
    });

/**
 * 処理名: BLOB 保存
 * 処理概要: データを Blob に変換し隠しリンク経由でダウンロードする
 * 実装理由: DB エクスポート・クエリ保存・ CSV 保存の共通ダウンロード処理を一元化するため
 * @param filename 保存ファイル名
 * @param data 保存データ
 * @param mime MIME タイプ
 */
const saveBlob = (filename: string, data: unknown, mime: string) => {
    const a = downloadLinkRef.value;
    if (!a) return;
    const blob = new Blob([data as BlobPart], { type: mime });
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

/**
 * 処理名: アタッチエイリアス生成
 * 処理概要: ファイル名から重複しないエイリアス文字列を生成する
 * 実装理由: 複数 DB をアタッチする際の名前衝突を防ぐため
 * @param fileName 元にするファイル名
 * @param dbInst 重複チェックに使用する SQLiteManager インスタンス（省略時は現在の db）
 * @returns 重複しないエイリアス文字列
 */
const toAttachAlias = (fileName: string, dbInst?: SQLiteManager): string => {
    const inst = dbInst ?? db;
    const base = fileName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_').replace(/^([0-9])/, '_$1') || 'attached_db';
    let alias = base;
    let i = 1;
    while (alias === DATASET_DB_ALIAS || inst?.hasAttachedDatabase(alias)) {
        alias = `${base}_${i++}`;
    }
    return alias;
};

// ---- クエリ実行 ----
/** クエリ実行結果 1 件の型定義 */
type QueryResultItem = { success: boolean; results?: Record<string, unknown>[]; columns?: string[]; error?: string; info?: { changes?: number } };

/**
 * 処理名: クエリ結果アイテム処理
 * 処理概要: 1 件のクエリ実行結果を解析し結果タブまたはメッセージに反映する
 * 実装理由: handleRunQuery の Cognitive Complexity を削減するため分離
 * @param result クエリ実行結果オブジェクト
 * @param idx 結果インデックス（0 始まり）
 * @param total 全クエリ数
 * @param executionId 実行シリアル ID
 * @param messages メッセージ収集配列
 * @returns 結果セットが存在する場合 true
 */
const processResultItem = (result: QueryResultItem, idx: number, total: number, executionId: number, messages: string[]): boolean => {
    if (result.success && result.results?.length) {
        const tableId = `results-table-${executionId}-${idx + 1}`;
        const label = total === 1 ? 'Results' : `Results${idx + 1}`;
        mainAreaRef.value?.addResultTab(label, tableId);
        mainAreaRef.value?.setResultGridData(tableId, result as { columns: string[]; results: Record<string, unknown>[] });
        messages.push(`クエリ${idx + 1}: ${result.results.length} 行の結果`);
        return true;
    }
    if (result.success) {
        const msg = `クエリ${idx + 1}を実行しました: ${result.info?.changes ?? 0} 行に影響`;
        showSuccess(msg);
        messages.push(msg);
        return false;
    }
    const err = `クエリ${idx + 1}エラー: ${result.error}`;
    showError(err);
    messages.push(err);
    return false;
};

/**
 * 処理名: クエリ実行ハンドラ
 * 処理概要: エディタのアクティブなクエリを実行し結果タブに表示する
 * 実装理由: ユーザーの SQL 実行リクエストに対応するため
 */
const handleRunQuery = async () => {
    let dbInst: SQLiteManager;
    try { dbInst = await getDb(); } catch { showError('データベースが初期化されていません'); return; }
    const query = mainAreaRef.value?.getActiveQuery()?.trim();
    if (!query) { showError('実行するクエリを入力してください'); return; }

    queryExecutionSerial += 1;
    const executionId = queryExecutionSerial;
    mainAreaRef.value?.clearResultTabs();
    await nextTick();

    try {
        const results = dbInst.executeQuery(query) as QueryResultItem[];
        const messages: string[] = [];
        let anyResult = false;

        for (let idx = 0; idx < results.length; idx++) {
            if (processResultItem(results[idx], idx, results.length, executionId, messages)) {
                anyResult = true;
            }
        }

        mainAreaRef.value?.setMessages(messages);
        if (!anyResult) {
            mainAreaRef.value?.switchResultTab('messages-tab');
        }
    } catch (error) {
        const msg = `クエリ実行中にエラーが発生しました: ${(error as Error).message}`;
        showError(msg);
        mainAreaRef.value?.setMessages(msg);
    }
};

// ---- DB操作 ----
/**
 * 処理名: 新規 DB 作成ハンドラ
 * 処理概要: サンプルデータ入りの新規インメモリ DB を作成する
 * 実装理由: メニューの「New DB」操作に対応するため
 */
const handleNewDb = async () => {
    try {
        const dbInst = await getDb();
        await dbInst.import(null);
        ensureDatasetDatabase(dbInst);
        dbInst.executeQuery(`CREATE TABLE IF NOT EXISTS test (col1 INTEGER PRIMARY KEY, col2 TEXT)`);
        dbInst.executeQuery(`INSERT OR IGNORE INTO test VALUES (1, '111')`);
        dbInst.executeQuery(`INSERT OR IGNORE INTO test VALUES (2, '222')`);
        setDbStatus('new_database.db');
        mainHidden = false;
        showSuccess(`新しいデータベース 'new_database.db' を作成しました`);
        refreshTrees();
    } catch (e) {
        showError(`データベース作成エラー: ${(e as Error).message}`);
    }
};

/**
 * 処理名: DB ファイルアタッチ
 * 処理概要: 1 つの DB ファイルを読み込みエイリアスを付けてアタッチする
 * 実装理由: handleOpenDb と handleDbTreeDrop の共通処理を分離するため
 * @param dbInst SQLiteManager インスタンス
 * @param file アタッチする DB ファイル
 */
const attachFileToDb = async (dbInst: SQLiteManager, file: File): Promise<void> => {
    const data = new Uint8Array(await readFileAsArrayBuffer(file));
    const alias = toAttachAlias(file.name, dbInst);
    try {
        dbInst.attachDatabase(alias, data);
        showSuccess(`'${file.name}' をエイリアス '${alias}' でアタッチしました`);
    } catch (e) {
        showError(`'${file.name}' のアタッチ失敗: ${(e as Error).message}`);
    }
};

/**
 * 処理名: 複数 DB ファイルのアタッチ
 * 処理概要: 指定インデックス以降のファイルをすべて DB にアタッチする
 * 実装理由: handleOpenDb と handleDbTreeDrop で共通利用するため分離
 * @param dbInst SQLiteManager インスタンス
 * @param files アタッチするファイル配列
 * @param startIdx 開始インデックス（省略時 0）
 */
const attachAdditionalFiles = async (dbInst: SQLiteManager, files: File[], startIdx = 0): Promise<void> => {
    for (let i = startIdx; i < files.length; i++) {
        await attachFileToDb(dbInst, files[i]);
    }
};

/**
 * 処理名: DB ファイルを開く
 * 処理概要: ファイル選択ダイアログで選択した DB ファイルを開くかアタッチする
 * 実装理由: 既存 DB がある場合はアタッチ、ない場合はメインとして開く 2 つのモードに対応
 */
const handleOpenDb = async () => {
    try {
        const files = await pickFiles('.db,.sqlite,.sqlite3,.db3', true);
        if (!files.length) return;
        const dbInst = await getDb();
        const hasExisting = currentDbPath !== 'Untitled.db' || mainHidden;
        if (hasExisting) {
            await attachAdditionalFiles(dbInst, files, 0);
        } else {
            const first = files[0];
            const data = new Uint8Array(await readFileAsArrayBuffer(first));
            await dbInst.import(data);
            ensureDatasetDatabase(dbInst);
            mainHidden = false;
            setDbStatus(first.name);
            showSuccess(`データベース '${first.name}' を開きました`);
            await attachAdditionalFiles(dbInst, files, 1);
        }
        refreshTrees();
    } catch (e) {
        showError(`インポートエラー: ${(e as Error).message}`);
    }
};

/**
 * 処理名: DB 保存ハンドラ
 * 処理概要: 現在の DB をバイナリエクスポートしダウンロードする
 * 実装理由: メニューの「Save DB」操作に対応するため
 */
const handleSaveDb = async () => {
    try {
        const dbInst = await getDb();
        const data = await dbInst.export();
        saveBlob('exported.db', data, 'application/sqlite.db');
        showSuccess('データベースをエクスポートしました');
    } catch (e) {
        showError(`エクスポートエラー: ${(e as Error).message}`);
    }
};

// ---- クエリファイル操作 ----
/**
 * 処理名: 新規クエリタブハンドラ
 * 処理概要: 新規クエリタブを MainArea に追加する
 * 実装理由: メニューの「New Query」操作に対応するため
 */
const handleNewQuery = () => {
    mainAreaRef.value?.addQueryTab('Query');
};

/**
 * 処理名: SQL ファイルを開くハンドラ
 * 処理概要: .sql ファイルを読み込んでエディタに設定する
 * 実装理由: メニューの「Open Query」操作に対応するため
 */
const handleOpenQuery = async () => {
    try {
        const files = await pickFiles('.sql');
        if (!files.length) return;
        const text = await readFileAsText(files[0]);
        mainAreaRef.value?.setActiveQuery(text);
        showSuccess(`SQLファイル '${files[0].name}' を読み込みました`);
    } catch (e) {
        showError(`SQLファイル読み込みエラー: ${(e as Error).message}`);
    }
};

/**
 * 処理名: クエリ保存ハンドラ
 * 処理概要: 現在のクエリを .sql ファイルとしてダウンロードする
 * 実装理由: メニューの「Save Query」操作に対応するため
 */
const handleSaveQuery = () => {
    const query = mainAreaRef.value?.getActiveQuery() ?? '';
    if (!query.trim()) { showError('保存するSQLクエリがありません'); return; }
    saveBlob('query.sql', query, 'application/sql');
    showSuccess('クエリを query.sql として保存しました');
};

// ---- Sidebar イベント ----
/**
 * 処理名: DB ツリーリフレッシュハンドラ
 * 処理概要: サイドバーの DB ツリーとデータセットツリーを再描画する
 * 実装理由: リフレッシュボタン操作に対応するため
 */
const handleRefreshDb = () => {
    refreshTrees();
};

/**
 * 処理名: DB デタッチハンドラ
 * 処理概要: 指定エイリアスの DB をデタッチする（main の場合は陰蔽）
 * 実装理由: サイドバーのデタッチボタン操作に対応するため
 * @param alias デタッチする DB エイリアス
 */
const handleDetachDb = async (alias: string) => {
    try {
        const dbInst = await getDb();
        if (alias === 'main') {
            void dbInst;
            mainHidden = true;
            setDbStatus('Untitled.db');
            showSuccess('メインデータベースを閉じました');
        } else {
            dbInst.detachDatabase(alias);
            showSuccess(`'${alias}' をデタッチしました`);
        }
        refreshTrees();
    } catch (e) {
        showError(`デタッチ失敗: ${(e as Error).message}`);
    }
};

/**
 * 処理名: CSV データセット追加ハンドラ
 * 処理概要: CSV ファイルを選択し dataset DB にインポートする
 * 実装理由: サイドバーの「データセット追加」ボタン操作に対応するため
 */
const handleAddDataset = async () => {
    const [file] = await pickFiles('.csv,text/csv');
    if (!file) return;
    let dbInst: SQLiteManager;
    try { dbInst = await getDb(); } catch { return; }
    try {
        const tableName = await importCsvFileAsDataset(dbInst, file);
        showSuccess(`データセット「${tableName}」を登録しました`);
        sidebarRef.value?.updateDatasetTree(listDatasetTables(dbInst));
    } catch (e) {
        showError((e instanceof Error ? e.message : String(e)) || 'CSVの読み込みに失敗しました');
    }
};

/**
 * 処理名: データセット削除ハンドラ
 * 処理概要: 指定名のデータセットテーブルを dataset DB から削除する
 * 実装理由: サイドバーのデータセット削除ボタン操作に対応するため
 * @param name 削除するデータセット名
 */
const handleDeleteDataset = async (name: string) => {
    try {
        const dbInst = await getDb();
        deleteDatasetTable(dbInst, name);
        showSuccess(`データセット「${name}」を削除しました`);
        sidebarRef.value?.updateDatasetTree(listDatasetTables(dbInst));
    } catch (e) {
        showError(`データセット削除失敗: ${(e as Error).message}`);
    }
};

/**
 * 処理名: DBツリードロップハンドラ
 * 処理概要: DBツリーにドラッグアンドドロップされたファイルを開く
 * 実装理由: DBツリーへのドラッグ操作に対応するため
 * @param dropped ドロップされたファイル配列
 */
const handleDbTreeDrop = async (dropped: File[]) => {
    try {
        const dbInst = await getDb();
        const first = dropped[0];
        const data = new Uint8Array(await readFileAsArrayBuffer(first));
        await dbInst.import(data);
        ensureDatasetDatabase(dbInst);
        mainHidden = false;
        setDbStatus(first.name);
        showSuccess(`データベース '${first.name}' を開きました`);
        await attachAdditionalFiles(dbInst, dropped, 1);
        refreshTrees();
    } catch (err) {
        showError(`インポートエラー: ${(err as Error).message}`);
    }
};

/**
 * 処理名: クエリ設定ハンドラ
 * 処理概要: サイドバーから渡された SQL をエディタにセットする
 * 実装理由: テーブルクリック時にクエリをエディタに挿入するため
 * @param query 設定する SQL 文字列
 */
const handleSetQuery = (query: string) => {
    mainAreaRef.value?.setActiveQuery(query);
};

/**
 * 処理名: DDL表示ハンドラ
 * 処理概要: サイドバー右クリックメニューで選択された DB オブジェクトの DDL をエディタに設定する
 * 実装理由: テーブル/ビュー/インデックス/トリガー定義を素早く確認できるようにするため
 * @param payload DDL 表示対象情報
 * @param payload.alias 対象オブジェクトの DB エイリアス
 * @param payload.name 対象オブジェクト名
 * @param payload.objectType 対象オブジェクト種別
 */
const handleShowDdl = async (payload: { alias: string; name: string; objectType: 'table' | 'view' | 'index' | 'trigger' }) => {
    try {
        const dbInst = await getDb();
        const ddl = dbInst.getSchemaObjectDdl(payload.alias, payload.objectType, payload.name);
        const normalizedDdl = ddl.trim().endsWith(';') ? ddl.trim() : `${ddl.trim()};`;
        mainAreaRef.value?.setActiveQuery(normalizedDdl);
        showSuccess(`DDLを表示しました: ${payload.alias}.${payload.name}`);
    } catch (e) {
        showError(`DDL表示失敗: ${(e as Error).message}`);
    }
};

// ---- MainArea イベント ----
/**
 * 処理名: データセット登録ハンドラ
 * 処理概要: アクティブな結果セットをデータセットとして dataset DB に登録する
 * 実装理由: 結果エリアの「Register as Dataset」ボタン操作に対応するため
 */
const handleRegisterDataset = async () => {
    let dbInst: SQLiteManager;
    try { dbInst = await getDb(); } catch { return; }
    const resultData = mainAreaRef.value?.getCurrentResultData();
    if (!resultData) { showError('No active results tab found'); return; }
    const name = prompt('Enter dataset name', 'dataset_' + Date.now());
    if (!name) return;
    try {
        const registered = registerRowsAsDatasetTable(dbInst, name, resultData.columns, resultData.data);
        showSuccess(`Dataset '${registered}' registered`);
        sidebarRef.value?.updateDatasetTree(listDatasetTables(dbInst));
    } catch (e) {
        showError((e instanceof Error ? e.message : String(e)) || 'Failed to register dataset');
    }
};

/**
 * 処理名: CSV ダウンロードハンドラ
 * 処理概要: アクティブな結果データを CSV 形式でダウンロードする
 * 実装理由: 結果エリアの「Download CSV」ボタン操作に対応するため
 */
const handleDownloadCsv = () => {
    const data = mainAreaRef.value?.getCurrentResultData();
    if (!data) { showError('ダウンロードするデータがありません'); return; }
    const { columns, data: rows } = data;
    const csvLines = [
        columns.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','),
        ...rows.map(row => columns.map(col => `"${String(row[col] ?? '').replace(/"/g, '""')}"`).join(',')),
    ];
    saveBlob('results.csv', csvLines.join('\n'), 'text/csv;charset=utf-8;');
};

// ---- splitter ----
useColumnSplitter(splitterEl, () => sidebarRef.value?.$el as HTMLElement | undefined);

// ---- DB初期化 ----
onMounted(async () => {
    const dbInitPromise = (window as { __dbInitPromise?: Promise<SQLiteManager> }).__dbInitPromise;
    if (dbInitPromise) {
        dbReady = dbInitPromise;
        db = await dbInitPromise;
        ensureDatasetDatabase(db);
        sidebarRef.value?.updateDatasetTree(listDatasetTables(db));
    }
});
</script>
