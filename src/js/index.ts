import SQLiteManager from './SQLiteManager';
import { createApp } from 'vue';
import App from './App.vue';
import '../css/app.scss';
// DataTables CSS は Results.ts でインポート済み


// SQLiteManager初期化をVueマウントと並行して早期に開始する（テストのタイミング問題を回避）
const dbInitPromise: Promise<SQLiteManager> = SQLiteManager.initialize(null, { print: console.log, printErr: console.error });
(window as unknown as { __dbInitPromise: Promise<SQLiteManager> }).__dbInitPromise = dbInitPromise;

createApp(App).mount('#app');