<template>
  <div id="sidebar" class="sidebar">
    <!-- Databasesツリー -->
    <div class="tree-block databases-tree-block">
      <div class="tree-title" style="cursor:pointer" @click="onDbTreeTitleClick">
        <span class="material-symbols-outlined tree-toggle-icon">{{ dbTreeOpen ? 'expand_more' : 'chevron_right' }}</span>
        Databases
        <button id="refresh-db-button" class="menu-button" @click.stop="$emit('refresh-db')">
          <span class="material-symbols-outlined">refresh</span>
        </button>
      </div>
      <div id="db-tree" v-show="dbTreeOpen" class="tree-view"
        @dragover.prevent
        @drop.prevent="onDbTreeDrop"
      >
        <div v-for="schema in dbSchemas" :key="schema.alias" class="tree-item">
          <div
            class="tree-label db-node"
            :data-db-alias="schema.alias"
            style="cursor:pointer;display:flex;align-items:center;justify-content:space-between"
            @click="toggleDbNode(schema.alias, $event)"
          >
            <span style="display:flex;align-items:center;gap:4px">
              <span class="material-symbols-outlined toggle-icon">{{ dbNodeOpen[schema.alias] ? 'expand_more' : 'chevron_right' }}</span>
              <span class="material-symbols-outlined icon">database</span>
              {{ schema.alias }}
            </span>
            <button
              class="menu-button"
              :data-detach-alias="schema.alias"
              :title="schema.alias === 'main' ? 'メインDBをリセット' : `'${schema.alias}' をデタッチ`"
              style="font-size:14px"
              @click.stop="$emit('detach-db', schema.alias)"
            >
              <span class="material-symbols-outlined">link_off</span>
            </button>
          </div>
          <div class="db-children tree-items" :style="{ display: dbNodeOpen[schema.alias] ? '' : 'none' }">
            <template v-for="group in [
              { title: 'Tables', items: schema.tables || [], icon: 'table_chart' },
              { title: 'Views', items: schema.views || [], icon: 'visibility' },
              { title: 'Indexes', items: schema.indexes || [], icon: 'list' },
              { title: 'Triggers', items: schema.triggers || [], icon: 'bolt' },
            ]" :key="group.title">
              <div class="tree-group">
                <div
                  class="tree-label"
                  :class="`${group.title}-root`"
                  style="cursor:pointer"
                  @click="toggleGroupNode(schema.alias, group.title)"
                >
                  <span class="material-symbols-outlined toggle-icon">
                    {{ groupNodeOpen[`${schema.alias}__${group.title}`] ? 'expand_more' : 'chevron_right' }}
                  </span>
                  <span class="material-symbols-outlined icon">{{ group.icon }}</span>
                  {{ group.title }}
                </div>
                <div class="tree-items" :style="{ display: groupNodeOpen[`${schema.alias}__${group.title}`] ? '' : 'none' }">
                  <div v-for="name in group.items" :key="name" class="tree-item">
                    <div
                      class="tree-label"
                      :class="group.title"
                      :data-name="name"
                      :data-db-alias="schema.alias"
                      @click="onTableClick(name, schema.alias)"
                    >
                      <span class="material-symbols-outlined icon">{{ group.icon }}</span>
                      {{ name }}
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- データセットツリー -->
    <div class="tree-block dataset-tree-block">
      <div class="tree-title" style="cursor:pointer" @click="onDatasetTreeTitleClick">
        <span class="material-symbols-outlined">{{ datasetTreeOpen ? 'expand_more' : 'chevron_right' }}</span>
        データセット
        <button id="add-dataset-button" class="menu-button" title="データセット追加" @click.stop="$emit('add-dataset')">
          <span class="material-symbols-outlined">upload_file</span>
        </button>
      </div>
      <div id="dataset-tree" v-show="datasetTreeOpen" class="tree-view">
        <div v-if="!datasetTables.length" class="tree-empty">データセットはありません</div>
        <div v-for="name in datasetTables" :key="name" class="tree-item">
          <div class="tree-label dataset-node" style="display:flex;align-items:center;justify-content:space-between">
            <span
              class="tree-label dataset"
              :data-name="name"
              :data-dataset-table-name="name"
              style="display:flex;align-items:center;gap:4px"
              @click="onDatasetClick(name)"
            >
              <span class="material-symbols-outlined icon">dataset</span>
              {{ name }}
            </span>
            <button
              class="menu-button"
              :data-delete-dataset-table="name"
              :title="`データセット '${name}' を削除`"
              style="font-size:14px"
              @click.stop="$emit('delete-dataset', name)"
            >
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { buildSelectAllQuery, DATASET_DB_ALIAS } from '../datasetDb';

defineOptions({ name: 'AppSidebar' });

const emit = defineEmits<{
  'refresh-db': [];
  'detach-db': [alias: string];
  'add-dataset': [];
  'delete-dataset': [name: string];
  'drop-files': [files: File[]];
  'set-query': [query: string];
}>();

// ---- Databases ツリー ----
const dbTreeOpen = ref(true);
const dbSchemas = ref<Array<{
  alias: string;
  tables?: string[];
  views?: string[];
  indexes?: string[];
  triggers?: string[];
}>>([]);
const dbNodeOpen = reactive<Record<string, boolean>>({});
const groupNodeOpen = reactive<Record<string, boolean>>({});

const onDbTreeTitleClick = () => { dbTreeOpen.value = !dbTreeOpen.value; };

const onDbTreeDrop = (e: DragEvent) => {
  const dropped = Array.from(e.dataTransfer?.files ?? []).filter(f => /\.db$/i.test(f.name));
  if (dropped.length) emit('drop-files', dropped);
};

const toggleDbNode = (alias: string, e: MouseEvent) => {
  if ((e.target as HTMLElement).closest('button.menu-button')) return;
  dbNodeOpen[alias] = !dbNodeOpen[alias];
};

const toggleGroupNode = (alias: string, title: string) => {
  const key = `${alias}__${title}`;
  groupNodeOpen[key] = !groupNodeOpen[key];
};

// ---- データセットツリー ----
const datasetTreeOpen = ref(true);
const datasetTables = ref<string[]>([]);

const onDatasetTreeTitleClick = () => { datasetTreeOpen.value = !datasetTreeOpen.value; };

const onTableClick = (name: string, alias: string) => {
  emit('set-query', buildSelectAllQuery(alias, name));
};

const onDatasetClick = (name: string) => {
  emit('set-query', buildSelectAllQuery(DATASET_DB_ALIAS, name));
};

// ---- 外部から呼び出す API ----
const updateDatabaseTree = (schemas: typeof dbSchemas.value) => {
  dbSchemas.value = schemas ?? [];
};

const updateDatasetTree = (tables: string[]) => {
  datasetTables.value = tables ?? [];
};

defineExpose({ updateDatabaseTree, updateDatasetTree });
</script>
