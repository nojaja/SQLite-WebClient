/**
 *
 */
export default class TabManager {
  /**
   *
   * @param root0
   * @param root0.containerId
   * @param root0.editorId
   * @param root0.resultsId
   * @param root0.messagesId
   */
  constructor({ containerId, editorId, resultsId, messagesId }) {
    console.log('TabManager initialized with container', containerId);
    this.tabsContainer = document.getElementById(containerId);
    this.editor = document.getElementById(editorId);
    this.resultsArea = document.getElementById(resultsId);
    this.messagesArea = document.getElementById(messagesId);
    this.states = {};
    this.activeTabId = 'query1';
    this.tabSerial = 2;// 通番カウンタ
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

  /**
   *
   * @param label
   */
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
    this.states[tabId] = { query: '', results: '', messages: this.defaultMessagesHTML };
    this.switchTab(tabId);
  }

  /**
   * 現在のタブ状態（クエリ・結果・メッセージ）を保存する
   */
  saveCurrentState() {
    if (!this.activeTabId) return;
    this.states[this.activeTabId].query = this.editor.value;
    const resultsTabs = document.querySelector('.results-tabs');
    const resultsGrid = document.getElementById('results-grid');
    this.states[this.activeTabId].results = JSON.stringify({
      tabs: resultsTabs ? resultsTabs.innerHTML : '',
      grid: resultsGrid ? resultsGrid.innerHTML : ''
    });
    this.states[this.activeTabId].messages = this.messagesArea.innerHTML;
  }

  /**
   * JSON解析済みの results/grid を DOM に反映する
   * @param parsed - { tabs, grid } オブジェクト
   */
  restoreParsedResults(parsed) {
    const resultsTabs = document.querySelector('.results-tabs');
    const resultsGrid = document.getElementById('results-grid');
    if (resultsTabs && resultsGrid) {
      resultsTabs.innerHTML = parsed.tabs;
      resultsGrid.innerHTML = parsed.grid;
    }
  }

  /**
   * Resultsをクリアし Messages タブのみ表示する
   */
  showEmptyResults() {
    const resultsMenuBar = document.querySelector('.results-menu-bar');
    if (resultsMenuBar) resultsMenuBar.style.display = 'none';
    const resultsTabs = document.querySelector('.results-tabs');
    const resultsGrid = document.getElementById('results-grid');
    if (resultsTabs) {
      resultsTabs.innerHTML = '';
      const msgTab = document.createElement('div');
      msgTab.classList.add('result-tab', 'active');
      msgTab.textContent = 'Messages';
      resultsTabs.appendChild(msgTab);
    }
    if (resultsGrid) resultsGrid.innerHTML = '';
  }

  /**
   * 保存済み state から Results エリアを復元する
   * @param state - タブ状態オブジェクト
   */
  restoreResultsState(state) {
    if (!state.results) { this.showEmptyResults(); return; }
    const resultsMenuBar = document.querySelector('.results-menu-bar');
    if (resultsMenuBar) resultsMenuBar.style.display = 'flex';
    let parsed;
    try { parsed = JSON.parse(state.results); } catch { parsed = null; }
    if (parsed && parsed.tabs !== undefined && parsed.grid !== undefined) {
      this.restoreParsedResults(parsed);
    } else {
      this.resultsArea.innerHTML = state.results;
    }
  }

  /**
   *
   * @param tabId
   */
  switchTab(tabId) {
    if (!this.states[tabId]) return;
    this.saveCurrentState();
    this.tabsContainer.querySelectorAll('.query-tab').forEach(t => t.classList.remove('active'));
    const newTab = this.tabsContainer.querySelector(`[data-tab-id="${tabId}"]`);
    if (newTab) newTab.classList.add('active');
    const state = this.states[tabId];
    this.editor.value = state.query;
    this.restoreResultsState(state);
    this.messagesArea.innerHTML = state.messages;
    this.activeTabId = tabId;
  }

  /**
   *
   * @param tabId
   */
  closeTab(tabId) {
    const tab = this.tabsContainer.querySelector(`[data-tab-id="${tabId}"]`);
    if (!tab) return;
    delete this.states[tabId];
    tab.remove();
    this.activateNextTab(tabId);
  }

  /**
   * 指定タブが閉じられた後に次のタブをアクティブにする
   * @param closedTabId - 閉じられたタブID
   */
  activateNextTab(closedTabId) {
    if (this.activeTabId !== closedTabId) return;
    this.activeTabId = null;
    const first = this.tabsContainer.querySelector('.query-tab');
    const mainArea = document.getElementById('main-area');
    if (first) {
      if (mainArea) mainArea.style.display = '';
      this.switchTab(first.dataset.tabId);
    } else {
      if (mainArea) mainArea.style.display = 'none';
    }
  }
}
