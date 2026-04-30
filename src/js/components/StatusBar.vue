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

/**
 * 処理名: ステータスクリア
 * 処理概要: ステータス表示を通常状態にリセットする
 * 実装理由: タイマー経過後にメッセージを消去するため
 */
const clearStatus = () => {
  statusType.value = 'normal';
  statusMessage.value = '';
};

/**
 * 処理名: エラー表示
 * 処理概要: エラーメッセージをステータスバーに5秒間表示する
 * 実装理由: クエリ失敗などのエラーをユーザーに通知するため
 * @param message 表示するエラーメッセージ
 */
const showError = (message: string) => {
  if (statusTimer) clearTimeout(statusTimer);
  statusMessage.value = message;
  statusType.value = 'error';
  statusTimer = setTimeout(clearStatus, 5000);
};

/**
 * 処理名: 成功表示
 * 処理概要: 成功メッセージをステータスバーに3秒間表示する
 * 実装理由: DB操作完了などをユーザーに通知するため
 * @param message 表示する成功メッセージ
 */
const showSuccess = (message: string) => {
  if (statusTimer) clearTimeout(statusTimer);
  statusMessage.value = message;
  statusType.value = 'success';
  statusTimer = setTimeout(clearStatus, 3000);
};

/**
 * 処理名: DB名設定
 * 処理概要: ステータスバーに表示するデータベース名を更新する
 * 実装理由: 開いているDBファイル名をユーザーに常時表示するため
 * @param name 表示するデータベース名
 */
const setDbName = (name: string) => {
  dbName.value = name;
};

defineExpose({ showError, showSuccess, setDbName, dbName });
</script>
