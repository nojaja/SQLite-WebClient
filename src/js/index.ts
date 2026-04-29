import SQLiteManager from './SQLiteManager';
import { createApp } from 'vue';
import App from './App.vue';
import $ from 'jquery';
import '../css/app.scss';
import 'datatables.net-dt/css/dataTables.dataTables.min.css';
import 'datatables.net-fixedheader-dt/css/fixedHeader.dataTables.min.css';


(window as unknown as { $: typeof $; jQuery: typeof $ }).$ = (window as unknown as { $: typeof $; jQuery: typeof $ }).jQuery = $;

// SQLiteManager初期化をVueマウントと並行して早期に開始する（テストのタイミング問題を回避）
const dbInitPromise: Promise<SQLiteManager> = SQLiteManager.initialize(null, { print: console.log, printErr: console.error });
(window as unknown as { __dbInitPromise: Promise<SQLiteManager> }).__dbInitPromise = dbInitPromise;

createApp(App).mount('#app');