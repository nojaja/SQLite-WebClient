<template>
    <div id="app-container" class="app-container">
        <MenuBar @open-help="showHelpModal" />
        <div class="main-layout">
            <Sidebar />
            <div class="splitter" ref="splitterEl"></div>
            <MainArea />
        </div>
        <StatusBar />
    </div>

    <!-- ヘルプモーダル（body直下に配置） -->
    <Teleport to="body">
        <div id="help-modal" style="display:none">
            <div class="modal-overlay" @click="hideHelpModal"></div>
            <div class="modal-content">
                <h2>Help and License</h2>
                <ul>
                    <li><a href="https://github.com/nojaja/SQLite-WebClient" target="_blank">GitHub Repository</a></li>
                </ul>
                <h3>Used Libraries and Licenses</h3>
                <ul>
                    <li><a href="https://www.npmjs.com/package/@sqlite.org/sqlite-wasm"
                            target="_blank">@sqlite.org/sqlite-wasm</a> (Apache-2.0)</li>
                    <li><a href="https://www.npmjs.com/package/datatables.net-vue3" target="_blank">DataTables (Vue3)</a> (MIT)
                    </li>
                    <li><a href="https://www.npmjs.com/package/dbgate-query-splitter"
                            target="_blank">dbgate-query-splitter</a> (MIT)</li>
                </ul>
                <button @click="hideHelpModal">閉じる</button>
            </div>
        </div>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import MenuBar from './components/MenuBar.vue';
import Sidebar from './components/Sidebar.vue';
import MainArea from './components/MainArea.vue';
import StatusBar from './components/StatusBar.vue';
import { attachSplitterEvents } from './ui/splitter';
import { setupDatasetTreeClickHandler } from './ui/Sidebar';
import { setupPanelArea } from './ui/PanelArea';
import { updateDatabaseTree } from './ui/Sidebar';
import { updateResultsGrid } from './ui/Results';
import { showError, showSuccess } from './ui/StatusBar';
import TabManager from './tabManager';
import { setupEventHandlers } from './events';

const splitterEl = ref<HTMLElement | null>(null);

const showHelpModal = () => {
    const modal = document.getElementById('help-modal');
    if (modal) modal.style.display = '';
};

const hideHelpModal = () => {
    const modal = document.getElementById('help-modal');
    if (modal) modal.style.display = 'none';
};

onMounted(() => {
    // サイドバーとスプリッターのドラッグ動作を設定
    const sidebarEl = document.getElementById('sidebar');
    if (sidebarEl && splitterEl.value) {
        attachSplitterEvents(splitterEl.value, sidebarEl);
    }

    // データセットツリーのクリックハンドラを設定
    setupDatasetTreeClickHandler();

    // パネルエリアの動作を設定（addResults, タブクリックなど）
    setupPanelArea();

    // タブマネージャーを初期化
    const tabManager = new TabManager({
        containerId: 'query-tabs',
        editorId: 'sql-editor',
        resultsId: 'results-grid',
        messagesId: 'messages-area'
    });
    (window as any).tabManager = tabManager;

    // 新規クエリボタンのイベント
    const newQueryBtn = document.getElementById('new-query-button');
    if (newQueryBtn) {
        newQueryBtn.addEventListener('click', () => {
            const mainArea = document.getElementById('main-area');
            if (mainArea && mainArea.style.display === 'none') {
                mainArea.style.display = '';
            }
            tabManager.addTab('Query');
        });
    }

    // index.tsでモジュールロード時に開始したSQLiteManager初期化プロミスを取得
    const dbInitPromise = (window as any).__dbInitPromise;

    // UIユーティリティオブジェクト
    const ui = {
        getElement: (id: string) => document.getElementById(id),
        updateResultsGrid: (data: any) => updateResultsGrid(data, document.getElementById('results-grid') as HTMLElement),
        updateDatabaseTree: (schema: any) => updateDatabaseTree(schema),
        showError: (message: string) => showError(message),
        showSuccess: (message: string) => showSuccess(message)
    };

    // DB初期化完了前にイベントハンドラを登録（open-db-buttonを早期に動作させるため）
    // setupEventHandlers内部でdbReadyを使って遅延初期化する
    setupEventHandlers(ui, dbInitPromise, tabManager);
});
</script>
