import { createApp } from 'vue';
import App from './App.vue';
import $ from 'jquery';
import '../css/app.scss';
import 'datatables.net-dt/css/dataTables.dataTables.min.css';
import 'datatables.net-fixedheader-dt/css/fixedHeader.dataTables.min.css';
import SQLiteManager from './SQLiteManager';

(window as any).$ = (window as any).jQuery = $;

// SQLiteManager初期化をVueマウントと並行して早期に開始する（テストのタイミング問題を回避）
const dbInitPromise: Promise<any> = SQLiteManager.initialize(null, { print: console.log, printErr: console.error });
(window as any).__dbInitPromise = dbInitPromise;

createApp(App).mount('#app');