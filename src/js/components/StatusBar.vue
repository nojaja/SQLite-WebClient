<template>
  <div id="status-bar" class="status-bar">
    <div v-if="statusType === 'error'" class="status-error">{{ statusMessage }}</div>
    <div v-else-if="statusType === 'success'" class="status-success">{{ statusMessage }}</div>
    <div v-else id="db-status" class="status-item">{{ dbName }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const dbName = ref('Untitled.db');
const statusMessage = ref('');
const statusType = ref<'normal' | 'error' | 'success'>('normal');

let statusTimer: ReturnType<typeof setTimeout> | null = null;

const clearStatus = () => {
  statusType.value = 'normal';
  statusMessage.value = '';
};

const showError = (message: string) => {
  if (statusTimer) clearTimeout(statusTimer);
  statusMessage.value = message;
  statusType.value = 'error';
  statusTimer = setTimeout(clearStatus, 5000);
};

const showSuccess = (message: string) => {
  if (statusTimer) clearTimeout(statusTimer);
  statusMessage.value = message;
  statusType.value = 'success';
  statusTimer = setTimeout(clearStatus, 3000);
};

const setDbName = (name: string) => {
  dbName.value = name;
};

defineExpose({ showError, showSuccess, setDbName, dbName });
</script>
