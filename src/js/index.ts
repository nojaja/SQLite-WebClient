import SQLiteManager from './SQLiteManager';
import { createApp } from 'vue';
import App from './App.vue';
import '../css/app.scss';
import { registerSqlCompletionProvider } from './sqlCompletionProvider';
// DataTables CSS は Results.ts でインポート済み

registerSqlCompletionProvider();

/**
 * 処理名: Service Worker 登録
 *
 * 処理概要:
 * PWAとしてインストール可能にするため、ページ読み込み後に
 * Service Worker を登録する
 *
 * 実装理由:
 * iPhone等のモバイル環境でホーム画面インストールに必要な
 * PWA要件を満たすため
 *
 * @returns {void}
 */
function registerServiceWorker(): void {
	void navigator.serviceWorker.register('/service-worker.js');
}

if ('serviceWorker' in navigator) {
	window.addEventListener('load', registerServiceWorker);
}


// SQLiteManager初期化をVueマウントと並行して早期に開始する（テストのタイミング問題を回避）
const dbInitPromise: Promise<SQLiteManager> = SQLiteManager.initialize(null, { print: console.log, printErr: console.error });
(window as unknown as { __dbInitPromise: Promise<SQLiteManager> }).__dbInitPromise = dbInitPromise;

createApp(App).mount('#app');