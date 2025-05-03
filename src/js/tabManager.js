export default class TabManager {
  constructor({ containerId, editorId, resultsId, messagesId }) {
    console.log('TabManager initialized with container', containerId);
    this.tabsContainer = document.getElementById(containerId);
    this.editor = document.getElementById(editorId);
    this.resultsArea = document.getElementById(resultsId);
    this.messagesArea = document.getElementById(messagesId);
    this.states = {};
    this.activeTabId = 'query1';
    this.tabSerial = 2; // 通番カウンタ
    // 初期状態保存
    this.states['query1'] = {
      query: this.editor.value,
      results: this.resultsArea.innerHTML,
      messages: this.messagesArea.innerHTML
    };
    // 初期のresults/messages HTMLを保存
    this.defaultResultsHTML = this.states['query1'].results;
    this.defaultMessagesHTML = this.states['query1'].messages;
    // 初期タブをアクティブ
    const firstTab = this.tabsContainer.querySelector('.query-tab');
    if (firstTab) {
      firstTab.classList.add('active');
      // 初期タブのクリックで切り替え
      firstTab.addEventListener('click', () => this.switchTab('query1'));
    }
  }

  addTab(label) {
    console.log('TabManager.addTab called with', label);
    const count = this.tabsContainer.querySelectorAll('.query-tab').length;
    const tabId = `query${this.tabSerial++}`;
    // ヘッダータブ生成
    const tab = document.createElement('div');
    tab.classList.add('query-tab');
    tab.dataset.tabId = tabId;
    tab.textContent = `${label}${tabId.replace('query','')}`;
    // タブクリックで切り替え
    tab.addEventListener('click', () => this.switchTab(tabId));
    // 閉じるボタン
    const close = document.createElement('span');
    close.classList.add('close-tab');
    close.textContent = '×';
    close.addEventListener('click', e => { e.stopPropagation(); this.closeTab(tabId); });
    tab.appendChild(close);
    this.tabsContainer.appendChild(tab);
    console.log('TabManager: after append, tab count =', this.tabsContainer.querySelectorAll('.query-tab').length);
    // 状態初期化: エリアHTMLを保持しておく
    this.states[tabId] = {
      query: '',
      results: this.defaultResultsHTML,
      messages: this.defaultMessagesHTML
    };
    // 切り替え
    this.switchTab(tabId);
    // --- 追加: 新規タブ時にUIも初期化 ---
    // エディタを空に
    this.editor.value = '';
    // Resultsグリッドを空テーブルに
    if (this.resultsArea) {
      this.resultsArea.innerHTML = '';
      // results-table, results-table-2...なども全削除
      Array.from(this.resultsArea.querySelectorAll('table')).forEach(tbl => tbl.remove());
      // Resultsタブ・テーブルを必ず1つだけ再生成
      const tabs = document.querySelector('.results-tabs');
      const resultsGrid = document.getElementById('results-grid');
      // Resultsタブを全削除
      Array.from(tabs.querySelectorAll('.result-tab')).forEach(tab => {
        if (tab.textContent === 'Results') tab.remove();
      });
      // Results系テーブルを全削除
      Array.from(resultsGrid.children).forEach(tbl => {
        if (tbl.id && tbl.id.startsWith('results-table')) tbl.remove();
      });
      // Resultsタブ・テーブルを1つだけ再生成
      const { addResults } = require('./ui/ImagesNotExists.js');
      addResults('Results', 'results-table');
    }
    // Messagesエリアも空に
    if (this.messagesArea) {
      this.messagesArea.innerHTML = '';
    }
    // --- 追加ここまで ---
    // query-area生成
    const mainArea = this.tabsContainer.parentElement;
    // 既存のquery-areaを非表示
    Array.from(mainArea.querySelectorAll('.query-area')).forEach(area => area.classList.remove('active'));
    const queryArea = document.createElement('div');
    queryArea.classList.add('query-area', 'active');
    queryArea.id = `query-area-${tabId}`;
    // クエリエディタ
    const queryEditor = document.createElement('div');
    queryEditor.id = 'query-editor';
    queryEditor.classList.add('query-editor');
    const editorTextarea = document.createElement('textarea');
    editorTextarea.id = 'sql-editor';
    editorTextarea.placeholder = 'SQLクエリを入力してください';
    editorTextarea.value = '';
    queryEditor.appendChild(editorTextarea);
    queryArea.appendChild(queryEditor);
    // queryTabsの直後に挿入
    const afterTabs = this.tabsContainer.nextSibling;
    mainArea.insertBefore(queryArea, afterTabs);
    // rowSplitterをアクティブなquery-areaの直後に移動し、エディタをセット
    const rowSplitter = mainArea.querySelector('.row-splitter');
    if (rowSplitter) {
      mainArea.insertBefore(rowSplitter, queryArea.nextSibling);
      if (rowSplitter.setQueryEditor) rowSplitter.setQueryEditor(queryEditor);
    }
    // 既存のquery-areaは非表示
    Array.from(mainArea.querySelectorAll('.query-area')).forEach(area => {
      area.style.display = area.classList.contains('active') ? '' : 'none';
    });
  }

  closeTab(tabId) {
    const tab = this.tabsContainer.querySelector(`[data-tab-id="${tabId}"]`);
    if (!tab) return;
    delete this.states[tabId];
    tab.remove();
    if (this.activeTabId === tabId) {
      this.activeTabId = null;
      const first = this.tabsContainer.querySelector('.query-tab');
      if (first) this.switchTab(first.dataset.tabId);
    }
    // query-area削除
    const mainArea = this.tabsContainer.parentElement;
    const area = mainArea.querySelector(`#query-area-${tabId}`);
    if (area) area.remove();
    // rowSplitterの位置も調整（残ったタブの直後へ）
    const rowSplitter = mainArea.querySelector('.row-splitter');
    const activeArea = mainArea.querySelector('.query-area.active');
    if (rowSplitter && activeArea) {
      mainArea.insertBefore(rowSplitter, activeArea.nextSibling);
      const queryEditor = activeArea.querySelector('.query-editor');
      if (rowSplitter.setQueryEditor && queryEditor) rowSplitter.setQueryEditor(queryEditor);
    }
  }

  switchTab(tabId) {
    console.log('TabManager.switchTab called for', tabId);
    if (!this.states[tabId]) return;
    // 旧アクティブ保存
    if (this.activeTabId) {
      this.states[this.activeTabId].query = this.editor.value;
      // Resultsタブ・テーブル構成を保存
      const resultsTabs = document.querySelector('.results-tabs');
      const resultsGrid = document.getElementById('results-grid');
      this.states[this.activeTabId].results = JSON.stringify({
        tabs: resultsTabs ? resultsTabs.innerHTML : '',
        grid: resultsGrid ? resultsGrid.innerHTML : ''
      });
      this.states[this.activeTabId].messages = this.messagesArea.innerHTML;
    }
    // ヘッダー更新
    this.tabsContainer.querySelectorAll('.query-tab').forEach(t => t.classList.remove('active'));
    const newTab = this.tabsContainer.querySelector(`[data-tab-id="${tabId}"]`);
    if (newTab) newTab.classList.add('active');
    // コンテンツ復元
    const state = this.states[tabId];
    this.editor.value = state.query;
    // Resultsタブ・テーブルを復元
    if (state.results) {
      let parsed;
      try {
        parsed = JSON.parse(state.results);
      } catch {
        parsed = null;
      }
      if (parsed && parsed.tabs !== undefined && parsed.grid !== undefined) {
        const resultsTabs = document.querySelector('.results-tabs');
        const resultsGrid = document.getElementById('results-grid');
        if (resultsTabs && resultsGrid) {
          resultsTabs.innerHTML = parsed.tabs;
          resultsGrid.innerHTML = parsed.grid;
          // タブ切替イベント再バインド
          const { setupResultsMessagesToggle } = require('./ui/ImagesNotExists.js');
          setupResultsMessagesToggle();
        }
      } else {
        // 旧形式（HTML文字列のみ）
        this.resultsArea.innerHTML = state.results;
      }
    } else {
      this.resultsArea.innerHTML = '';
    }
    // Messagesも復元
    this.messagesArea.innerHTML = state.messages;
    this.activeTabId = tabId;
    // query-area切り替え
    const mainArea = this.tabsContainer.parentElement;
    Array.from(mainArea.querySelectorAll('.query-area')).forEach(area => {
      area.classList.toggle('active', area.id === `query-area-${tabId}`);
      area.style.display = (area.id === `query-area-${tabId}`) ? '' : 'none';
    });
    // rowSplitterをアクティブなquery-areaの直後に移動し、エディタをセット
    const activeArea = mainArea.querySelector(`#query-area-${tabId}`);
    const rowSplitter = mainArea.querySelector('.row-splitter');
    if (activeArea && rowSplitter) {
      mainArea.insertBefore(rowSplitter, activeArea.nextSibling);
      const queryEditor = activeArea.querySelector('.query-editor');
      if (rowSplitter.setQueryEditor && queryEditor) rowSplitter.setQueryEditor(queryEditor);
    }
  }
}