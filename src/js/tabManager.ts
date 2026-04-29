export type TabState = {
  query: string;
  results: string;
  messages: string;
};

/**
 * クエリエディタと結果表示のタブ状態を管理する。
 */
export default class TabManager {
  tabsContainer: HTMLElement;
  editor: HTMLTextAreaElement;
  resultsArea: HTMLElement;
  messagesArea: HTMLElement;
  states: Record<string, TabState>;
  activeTabId: string | null;
  tabSerial: number;
  defaultResultsHTML: string;
  defaultMessagesHTML: string;

  /**
   * タブ管理に必要な DOM 要素を解決して初期状態を保存する。
   * @param options 各表示領域の DOM ID
   * @param options.containerId タブコンテナの DOM ID
   * @param options.editorId エディタ要素の DOM ID
   * @param options.resultsId 結果領域の DOM ID
   * @param options.messagesId メッセージ領域の DOM ID
   */
  constructor({ containerId, editorId, resultsId, messagesId }: { containerId: string; editorId: string; resultsId: string; messagesId: string }) {
    this.tabsContainer = document.getElementById(containerId) as HTMLElement;
    this.editor = document.getElementById(editorId) as HTMLTextAreaElement;
    this.resultsArea = document.getElementById(resultsId) as HTMLElement;
    this.messagesArea = document.getElementById(messagesId) as HTMLElement;
    this.states = {};
    this.activeTabId = 'query1';
    this.tabSerial = 2;// 通番カウンタ
    // 初期状態保存
    this.states.query1 = {
      query: this.editor.value,
      results: this.resultsArea.innerHTML,
      messages: this.messagesArea.innerHTML
    };
    // 初期のresults/messages HTMLを保存
    this.defaultResultsHTML = this.states.query1.results;
    this.defaultMessagesHTML = this.states.query1.messages;
    // 初期タブをアクティブ
    const firstTab = this.tabsContainer.querySelector('.query-tab') as HTMLElement | null;
    if (firstTab) {
      firstTab.classList.add('active');
      // 初期タブのクリックで切り替え
      firstTab.addEventListener('click', () => this.switchTab('query1'));
    }
  }

  /**
   * 新しいクエリタブを追加してアクティブにする。
   * @param label タブの表示ラベル
   */
  addTab(label: string) {
    const tabId = `query${this.tabSerial++}`;
    // ヘッダータブ生成
    const tab = document.createElement('div');
    tab.classList.add('query-tab');
    tab.dataset.tabId = tabId;
    tab.textContent = `${label}${tabId.replace('query', '')}`;
    tab.addEventListener('click', () => this.switchTab(tabId));
    const close = document.createElement('span');
    close.classList.add('close-tab');
    close.textContent = '×';
    close.addEventListener('click', e => {
      e.stopPropagation();
      this.closeTab(tabId);
    });
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
    const resultsTabs = document.querySelector('.results-tabs') as HTMLElement | null;
    const resultsGrid = document.getElementById('results-grid') as HTMLElement | null;
    this.states[this.activeTabId].results = JSON.stringify({
      tabs: resultsTabs ? resultsTabs.innerHTML : '',
      grid: resultsGrid ? resultsGrid.innerHTML : ''
    });
    this.states[this.activeTabId].messages = this.messagesArea.innerHTML;
  }

  /**
   * JSON解析済みの results/grid を DOM に反映する
   * @param parsed { tabs, grid } オブジェクト
   * @param parsed.tabs タブ一覧の HTML
   * @param parsed.grid 結果グリッドの HTML
   */
  restoreParsedResults(parsed: { tabs: string; grid: string }) {
    const resultsTabs = document.querySelector('.results-tabs') as HTMLElement | null;
    const resultsGrid = document.getElementById('results-grid') as HTMLElement | null;
    if (resultsTabs && resultsGrid) {
      resultsTabs.innerHTML = parsed.tabs;
      resultsGrid.innerHTML = parsed.grid;
    }
  }

  /**
   * Resultsをクリアし Messages タブのみ表示する
   */
  showEmptyResults() {
    const resultsMenuBar = document.querySelector('.results-menu-bar') as HTMLElement | null;
    if (resultsMenuBar) resultsMenuBar.style.display = 'none';
    const resultsTabs = document.querySelector('.results-tabs') as HTMLElement | null;
    const resultsGrid = document.getElementById('results-grid') as HTMLElement | null;
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
  restoreResultsState(state: TabState) {
    if (!state.results) {
      this.showEmptyResults();
      return;
    }
    const resultsMenuBar = document.querySelector('.results-menu-bar') as HTMLElement | null;
    if (resultsMenuBar) resultsMenuBar.style.display = 'flex';
    let parsed: { tabs: string; grid: string } | null = null;
    try {
      parsed = JSON.parse(state.results) as { tabs: string; grid: string };
    } catch {
      parsed = null;
    }
    if (parsed && parsed.tabs !== undefined && parsed.grid !== undefined) {
      this.restoreParsedResults(parsed);
    } else {
      this.resultsArea.innerHTML = state.results;
    }
  }

  /**
   * タブを切り替える
   * @param tabId - 切り替えるタブのID
   */
  switchTab(tabId: string) {
    if (!this.states[tabId]) return;
    this.saveCurrentState();
    this.tabsContainer.querySelectorAll('.query-tab').forEach(t => t.classList.remove('active'));
    const newTab = this.tabsContainer.querySelector(`[data-tab-id="${tabId}"]`) as HTMLElement | null;
    if (newTab) newTab.classList.add('active');
    const state = this.states[tabId];
    this.editor.value = state.query;
    this.restoreResultsState(state);
    this.messagesArea.innerHTML = state.messages;
    this.activeTabId = tabId;
  }

  /**
   * タブを閉じる
   * @param tabId - 閉じるタブのID
   */
  closeTab(tabId: string) {
    const tab = this.tabsContainer.querySelector(`[data-tab-id="${tabId}"]`) as HTMLElement | null;
    if (!tab) return;
    delete this.states[tabId];
    tab.remove();
    this.activateNextTab(tabId);
  }

  /**
   * 指定タブが閉じられた後に次のタブをアクティブにする
   * @param closedTabId - 閉じられたタブID
   */
  activateNextTab(closedTabId: string) {
    if (this.activeTabId !== closedTabId) return;
    this.activeTabId = null;
    const first = this.tabsContainer.querySelector('.query-tab') as HTMLElement | null;
    const mainArea = document.getElementById('main-area') as HTMLElement | null;
    if (first) {
      if (mainArea) mainArea.style.display = '';
      this.switchTab(first.dataset.tabId || 'query1');
    } else if (mainArea) {
      mainArea.style.display = 'none';
    }
  }
}
