import SQLiteManager from './SQLiteManager';
import { createApp } from 'vue';
import App from './App.vue';
import '../css/app.scss';
import { registerSqlCompletionProvider } from './sqlCompletionProvider';
// DataTables CSS は Results.ts でインポート済み

declare const __APP_VERSION__: string;

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
	const serviceWorkerUrl = `/service-worker.js?v=${encodeURIComponent(__APP_VERSION__)}`;
	void navigator.serviceWorker
		.register(serviceWorkerUrl, { updateViaCache: 'none' })
		.catch(() => undefined);
}

/**
 * 処理名: ローカル Service Worker 解除
 *
 * 処理概要:
 * localhost で以前登録された Service Worker を解除する
 *
 * 実装理由:
 * 開発環境で古い Service Worker 制御が残ると画面点滅やキャッシュ不整合が起きるため
 *
 * @returns {void}
 */
function cleanupLocalServiceWorkers(): void {
	void navigator.serviceWorker
		.getRegistrations()
		.then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
		.catch(() => undefined);
}

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
if ('serviceWorker' in navigator) {
	if (isLocalhost) {
		window.addEventListener('load', cleanupLocalServiceWorkers);
	} else {
		window.addEventListener('load', registerServiceWorker);
	}
}


// SQLiteManager初期化をVueマウントと並行して早期に開始する（テストのタイミング問題を回避）
const dbInitPromise: Promise<SQLiteManager> = SQLiteManager.initialize(null, { print: console.log, printErr: console.error });
(window as unknown as { __dbInitPromise: Promise<SQLiteManager> }).__dbInitPromise = dbInitPromise;

createApp(App).mount('#app');