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

const getDb = (): Promise<SQLiteManager> => {
    if (dbReady) return dbReady;
    return Promise.reject(new Error('DB未初期化'));
};

// ---- UIヘルパー ----
const showError = (msg: string) => statusBarRef.value?.showError(msg);
const showSuccess = (msg: string) => statusBarRef.value?.showSuccess(msg);
const setDbStatus = (name: string) => {
    currentDbPath = name;
    statusBarRef.value?.setDbName(name);
};

const getDisplaySchemas = (dbInst: SQLiteManager) => {
    const schemas = dbInst.getAllDatabaseSchemas().filter(s => s.alias !== DATASET_DB_ALIAS);
    return mainHidden ? schemas.filter(s => s.alias !== 'main') : schemas;
};

const refreshTrees = async () => {
    try {
        const dbInst = await getDb();
        sidebarRef.value?.updateDatabaseTree(getDisplaySchemas(dbInst));
        sidebarRef.value?.updateDatasetTree(listDatasetTables(dbInst));
    } catch { /* DB未初期化時は何もしない */ }
};

// ---- ファイルI/Oヘルパー ----
const readFileAsArrayBuffer = (file: Blob): Promise<ArrayBuffer> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });

const readFileAsText = (file: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string) ?? '');
        reader.onerror = reject;
        reader.readAsText(file);
    });

let filePickerResolve: ((files: File[]) => void) | null = null;
const onFileInputChange = () => {
    if (filePickerResolve && fileInputRef.value) {
        filePickerResolve(Array.from(fileInputRef.value.files ?? []));
        filePickerResolve = null;
    }
};

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
        const results = dbInst.executeQuery(query) as Array<{ success: boolean; results?: Record<string, unknown>[]; columns?: string[]; error?: string; info?: { changes?: number } }>;
        const messages: string[] = [];
        let anyResult = false;

        for (let idx = 0; idx < results.length; idx++) {
            const result = results[idx];
            if (result.success && result.results?.length) {
                const tableId = `results-table-${executionId}-${idx + 1}`;
                const label = results.length === 1 ? 'Results' : `Results${idx + 1}`;
                mainAreaRef.value?.addResultTab(label, tableId);
                mainAreaRef.value?.setResultGridData(tableId, result as { columns: string[]; results: Record<string, unknown>[] });
                messages.push(`クエリ${idx + 1}: ${result.results.length} 行の結果`);
                anyResult = true;
            } else if (result.success) {
                const msg = `クエリ${idx + 1}を実行しました: ${result.info?.changes ?? 0} 行に影響`;
                showSuccess(msg);
                messages.push(msg);
            } else {
                const err = `クエリ${idx + 1}エラー: ${result.error}`;
                showError(err);
                messages.push(err);
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

const handleOpenDb = async () => {
    try {
        const files = await pickFiles('.db', true);
        if (!files.length) return;
        const dbInst = await getDb();
        const hasExisting = currentDbPath !== 'Untitled.db' || mainHidden;
        if (hasExisting) {
            for (const file of files) {
                const data = new Uint8Array(await readFileAsArrayBuffer(file));
                const alias = toAttachAlias(file.name, dbInst);
                try {
                    dbInst.attachDatabase(alias, data);
                    showSuccess(`'${file.name}' をエイリアス '${alias}' でアタッチしました`);
                } catch (e) {
                    showError(`'${file.name}' のアタッチ失敗: ${(e as Error).message}`);
                }
            }
        } else {
            const first = files[0];
            const data = new Uint8Array(await readFileAsArrayBuffer(first));
            await dbInst.import(data);
            ensureDatasetDatabase(dbInst);
            mainHidden = false;
            setDbStatus(first.name);
            showSuccess(`データベース '${first.name}' を開きました`);
            for (let i = 1; i < files.length; i++) {
                const file = files[i];
                const d = new Uint8Array(await readFileAsArrayBuffer(file));
                const alias = toAttachAlias(file.name, dbInst);
                try {
                    dbInst.attachDatabase(alias, d);
                    showSuccess(`'${file.name}' をエイリアス '${alias}' でアタッチしました`);
                } catch (e) {
                    showError(`'${file.name}' のアタッチ失敗: ${(e as Error).message}`);
                }
            }
        }
        refreshTrees();
    } catch (e) {
        showError(`インポートエラー: ${(e as Error).message}`);
    }
};

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
const handleNewQuery = () => {
    mainAreaRef.value?.addQueryTab('Query');
};

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

const handleSaveQuery = () => {
    const query = mainAreaRef.value?.getActiveQuery() ?? '';
    if (!query.trim()) { showError('保存するSQLクエリがありません'); return; }
    saveBlob('query.sql', query, 'application/sql');
    showSuccess('クエリを query.sql として保存しました');
};

// ---- Sidebar イベント ----
const handleRefreshDb = () => {
    refreshTrees();
};

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
        for (let i = 1; i < dropped.length; i++) {
            const file = dropped[i];
            const d = new Uint8Array(await readFileAsArrayBuffer(file));
            const alias = toAttachAlias(file.name, dbInst);
            try { dbInst.attachDatabase(alias, d); showSuccess(`'${file.name}' をアタッチしました`); }
            catch (ae) { showError(`アタッチ失敗: ${(ae as Error).message}`); }
        }
        refreshTrees();
    } catch (err) {
        showError(`インポートエラー: ${(err as Error).message}`);
    }
};

const handleSetQuery = (query: string) => {
    mainAreaRef.value?.setActiveQuery(query);
};

// ---- MainArea イベント ----
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
