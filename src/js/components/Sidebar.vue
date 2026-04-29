<template>
  <div id="sidebar" class="sidebar">
    <!-- Databasesツリー -->
    <div class="tree-block databases-tree-block">
      <div class="tree-title" style="cursor:pointer" @click="onDbTreeTitleClick">
        <span class="material-symbols-outlined tree-toggle-icon">{{ dbTreeOpen ? 'expand_more' : 'chevron_right' }}</span>
        Databases
        <button id="refresh-db-button" class="menu-button" @click.stop>
          <span class="material-symbols-outlined">refresh</span>
        </button>
      </div>
      <div id="db-tree" class="tree-view" v-show="dbTreeOpen"></div>
    </div>

    <!-- データセットツリー -->
    <div class="tree-block dataset-tree-block">
      <div class="tree-title" style="cursor:pointer" @click="onDatasetTreeTitleClick">
        <span class="material-symbols-outlined">{{ datasetTreeOpen ? 'expand_more' : 'chevron_right' }}</span>
        データセット
        <button id="add-dataset-button" class="menu-button" title="データセット追加" @click.stop>
          <span class="material-symbols-outlined">upload_file</span>
        </button>
      </div>
      <div id="dataset-tree" class="tree-view" v-show="datasetTreeOpen"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineOptions({
  name: 'AppSidebar',
});

const dbTreeOpen = ref(true);
const datasetTreeOpen = ref(true);

const onDbTreeTitleClick = () => {
  dbTreeOpen.value = !dbTreeOpen.value;
};

const onDatasetTreeTitleClick = () => {
  datasetTreeOpen.value = !datasetTreeOpen.value;
};
</script>
