<template>
  <div id="editable-grid-container" class="results-grid" v-show="visible">
    <div
      v-for="tab in editableGridTabs"
      :key="tab.id"
      :id="tab.id"
      v-show="activeResultTabId === tab.id"
      style="display: flex; flex-direction: column; height: 100%;"
    >
      <EditableGridPanel
        :grid-id="`${tab.state.mode}-${tab.state.alias}-${tab.state.tableName}`"
        :alias="tab.state.alias"
        :table-name="tab.state.tableName"
        :columns="tab.state.columns"
        :data="tab.state.data"
        :mode="tab.state.mode"
        :primary-key-field="tab.state.primaryKeyField"
        @query-generated="$emit('query-generated', $event)"
        @update-query-generated="$emit('update-query-generated', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { type PropType } from 'vue';
import EditableGridPanel from './EditableGridPanel.vue';

defineOptions({ name: 'EditableGridViewPanel' });

interface EditableGridState {
  mode: 'table-definition' | 'table-data';
  alias: string;
  tableName: string;
  columns: Array<{
    title: string;
    field: string;
    editor?: string;
    editorParams?: Record<string, unknown>;
  }>;
  data: Record<string, unknown>[];
  primaryKeyField?: string;
}

interface Props {
  visible: boolean;
  editableGridTabs: Array<{
    id: string;
    label: string;
    state: EditableGridState;
  }>;
  activeResultTabId: string;
}

defineEmits<{
  'query-generated': [query: string];
  'update-query-generated': [query: string];
}>();

defineProps({
  editableGridTabs: {
    type: Array as PropType<Props['editableGridTabs']>,
    required: true,
  },
  visible: {
    type: Boolean,
    required: true,
  },
  activeResultTabId: {
    type: String,
    required: true,
  },
});
</script>
