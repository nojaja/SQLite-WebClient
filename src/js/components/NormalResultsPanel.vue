<template>
  <div id="results-grid" class="results-grid" v-show="visible">
    <div
      v-for="tab in closableTabs"
      :key="tab.resultsId"
      :id="tab.resultsId"
      v-show="activeResultTabId === tab.id"
      style="display: flex; flex-direction: column; height: 100%;"
    >
      <div class="results-toolbar" v-show="showResultsMenuBar">
        <button id="register-dataset-btn" class="toolbar-button" @click="$emit('register-dataset')">
          <span class="material-symbols-outlined">playlist_add</span> Register as Dataset
        </button>
        <button id="csv-download-button" class="toolbar-button" @click="$emit('download-csv')">
          <span class="material-symbols-outlined">download</span> Download CSV
        </button>
      </div>
      <div
        v-if="hasResultGridData(tab.resultsId)"
        :id="`tabulator-${tab.resultsId}`"
        class="tabulator-host"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

defineOptions({ name: 'NormalResultsPanel' });

interface ResultTab {
  id: string;
  label: string;
  resultsId: string;
  closable: boolean;
}

interface Props {
  visible: boolean;
  resultTabs: ResultTab[];
  activeResultTabId: string;
  showResultsMenuBar: boolean;
  hasResultGridData: (tableId: string) => boolean;
}

defineEmits<{
  'register-dataset': [];
  'download-csv': [];
}>();

const props = defineProps<Props>();

const closableTabs = computed(() => props.resultTabs.filter((tab) => tab.closable));
</script>
