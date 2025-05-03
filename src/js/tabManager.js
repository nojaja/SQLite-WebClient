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
    const tabId = `query${this.tabSerial++}`;
    // ヘッダータブ生成
    const tab = document.createElement('div');
    tab.classList.add('query-tab');
    tab.dataset.tabId = tabId;
    tab.textContent = `${label}${tabId.replace('query','')}`;
    tab.addEventListener('click', () => this.switchTab(tabId));
    const close = document.createElement('span');
    close.classList.add('close-tab');
    close.textContent = '×';
    close.addEventListener('click', e => { e.stopPropagation(); this.closeTab(tabId); });
    tab.appendChild(close);
    this.tabsContainer.appendChild(tab);
    // 状態初期化
    this.states[tabId] = {
      query: '',
      refDataset: '',
      results: this.defaultResultsHTML,
      messages: this.defaultMessagesHTML
    };
    this.switchTab(tabId);
  }

  switchTab(tabId) {
    if (!this.states[tabId]) return;
    // 旧アクティブ保存
    if (this.activeTabId) {
      this.states[this.activeTabId].query = this.editor.value;
      // 参照データプルダウンの値も保存
      const refSelect = document.querySelector('.ref-dataset-select');
      if (refSelect) this.states[this.activeTabId].refDataset = refSelect.value;
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
    // 参照データプルダウン復元
    const refSelect = document.querySelector('.ref-dataset-select');
    if (refSelect) refSelect.value = state.refDataset || '';
    // Resultsタブ・テーブルを復元
    if (state.results) {
      let parsed;
      try { parsed = JSON.parse(state.results); } catch { parsed = null; }
      if (parsed && parsed.tabs !== undefined && parsed.grid !== undefined) {
        const resultsTabs = document.querySelector('.results-tabs');
        const resultsGrid = document.getElementById('results-grid');
        if (resultsTabs && resultsGrid) {
          resultsTabs.innerHTML = parsed.tabs;
          resultsGrid.innerHTML = parsed.grid;
          const { setupResultsMessagesToggle } = require('./ui/ImagesNotExists.js');
          setupResultsMessagesToggle();
        }
      } else {
        this.resultsArea.innerHTML = state.results;
      }
    } else {
      this.resultsArea.innerHTML = '';
    }
    this.messagesArea.innerHTML = state.messages;
    this.activeTabId = tabId;
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
  }
}