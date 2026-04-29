<template>
  <div id="main-area" class="main-area">
    <!-- クエリタブ -->
    <div id="query-tabs" class="query-tabs">
      <div class="query-tab active" data-tab-id="query1">
        Query1<span class="close-tab" @click.stop="closeInitialTab">×</span>
      </div>
    </div>

    <!-- クエリエリア -->
    <div class="query-area active" id="query-area-query1">
      <div id="query-editor" class="query-editor">
        <textarea id="sql-editor" placeholder="SQLクエリを入力してください"></textarea>
      </div>
    </div>

    <!-- 水平スプリッター -->
    <div class="row-splitter" ref="rowSplitterEl"></div>

    <!-- パネルエリア -->
    <div class="panel-area">
      <!-- 結果タブ（動的に追加される） -->
      <div class="results-tabs"></div>

      <!-- 結果エリア -->
      <div id="results-area" class="results-area">
        <div id="results-grid" class="results-grid"></div>
        <div class="results-menu-bar" style="display:none">
          <button id="register-dataset-btn" class="menu-button">
            <span class="material-symbols-outlined">playlist_add</span> Register as Dataset
          </button>
          <button id="csv-download-button" class="menu-button">
            <span class="material-symbols-outlined">download</span> Download CSV
          </button>
        </div>
      </div>

      <!-- メッセージエリア -->
      <div id="messages-area" class="messages-area"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { attachRowSplitterEvents } from '../ui/rowSplitter';

const rowSplitterEl = ref<HTMLElement | null>(null);

const closeInitialTab = () => {
  const tabManager = (window as any).tabManager;
  if (tabManager) tabManager.closeTab('query1');
};

onMounted(() => {
  if (rowSplitterEl.value) {
    const queryEditorEl = document.getElementById('query-editor');
    attachRowSplitterEvents(rowSplitterEl.value, queryEditorEl);
  }
});
</script>
