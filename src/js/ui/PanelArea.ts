// PanelArea.js
import { UI_IDS } from './constants';
import * as ResultsArea from './ResultsArea';
import * as MessagesArea from './MessagesArea';

/**
 * Vue移行後: Vueがレンダリング済みのDOM構造に対してパネルエリアの動作を設定する
 */
export function setupPanelArea() {
    const resultsTabs = document.querySelector('.results-tabs') as HTMLElement;
    if (!resultsTabs) return;

    /**
     * タブ切り替え時のアクション
     * @param tab
     */
    const activeAction = (tab: HTMLElement) => {
        const resultsMenuBar = document.querySelector('.results-menu-bar') as HTMLElement;
        const resultsGrid = document.getElementById(UI_IDS.RESULTS_GRID);
        if (tab.textContent === 'Messages') {
            ResultsArea.hideResultsArea();
            MessagesArea.showMessagesArea();
            if (resultsMenuBar) resultsMenuBar.style.display = 'none';
        } else {
            ResultsArea.showResultsArea();
            MessagesArea.hideMessagesArea();
            if (resultsMenuBar) resultsMenuBar.style.display = 'flex';
            if (resultsGrid) {
                Array.from(resultsGrid.children).forEach(tbl => {
                    (tbl as HTMLElement).style.display = (tbl.id === tab.dataset.resultsId) ? '' : 'none';
                });
            }
        }
    };

    /**
     * タブを追加するローカル関数（PanelAreaViewと同等の動作）
     * @param label
     * @param id
     * @param addaction
     * @param removeaction
     */
    const addTab = (
        label: string,
        id: string = null,
        addaction: ((tabs: HTMLElement, tab: HTMLElement) => void) | null = null,
        removeaction: ((label: string, id: string) => void) | null = null
    ): HTMLElement => {
        const newTab = document.createElement('div');
        newTab.classList.add('result-tab', 'active');
        newTab.textContent = label;
        newTab.dataset.resultsId = id || `results-table-${label}`;

        if (removeaction) {
            const close = document.createElement('span');
            close.classList.add('close-tab');
            close.textContent = '×';
            close.addEventListener('click', e => {
                e.stopPropagation();
                const tabsParent = resultsTabs;
                removeaction(label, id);
                newTab.remove();
                const remainTabs = Array.from(tabsParent.querySelectorAll('.result-tab'))
                    .filter(t => t !== newTab && t.textContent !== 'Messages') as HTMLElement[];
                if (remainTabs.length > 0) {
                    remainTabs[0].classList.add('active');
                }
            });
            newTab.appendChild(close);
        }

        if (addaction) {
            addaction(resultsTabs, newTab);
        } else {
            resultsTabs.appendChild(newTab);
        }
        return newTab;
    };

    // タブクリックハンドラ
    resultsTabs.addEventListener('click', (e: MouseEvent) => {
        const tab = (e.target as Element).closest('.result-tab') as HTMLElement;
        if (!tab) return;
        resultsTabs.querySelectorAll('.result-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeAction(tab);
    });

    // Messagesタブを追加
    addTab('Messages', 'messages-area');

    /**
     * window.addResults をセットアップ（クエリ実行結果タブの動的追加）
     * @param label
     * @param tableId
     */
    (window as any).addResults = (label: string, tableId: string = null) => {
        const tabs = document.querySelector('.results-tabs') as HTMLElement;
        const resultsGrid = document.getElementById(UI_IDS.RESULTS_GRID);
        if (!tabs || !resultsGrid) return null;

        const resTab = addTab(
            label,
            tableId,
            (resultsTabs, newTab) => {
                // Messagesタブの直前に挿入
                const msgTab = tabs.querySelector('.result-tab:last-child');
                const resultsMenuBar = document.querySelector('.results-menu-bar') as HTMLElement;
                if (resultsMenuBar) resultsMenuBar.style.display = 'flex';
                resultsTabs.insertBefore(newTab, msgTab);
            },
            (label, id) => {
                const remainTabs = Array.from(tabs.querySelectorAll('.result-tab'))
                    .filter(t => { console.log(t); return t !== resTab && t.textContent !== 'Messages'; }) as HTMLElement[];
                if (remainTabs.length > 0) {
                    remainTabs[0].classList.add('active');
                    MessagesArea.hideMessagesArea();
                    ResultsArea.showResultsArea();
                } else {
                    const msgTab = tabs.querySelector('.result-tab:last-child') as HTMLElement;
                    if (msgTab) msgTab.classList.add('active');
                    MessagesArea.showMessagesArea();
                    ResultsArea.hideResultsArea();
                }
            }
        );

        // テーブル作成
        const resultsTable = document.createElement('table');
        resultsTable.id = resTab.dataset.resultsId;
        resultsTable.classList.add('display', 'dataTable');
        resultsTable.style.display = 'none';
        const emptyTbody = document.createElement('tbody');
        resultsTable.appendChild(emptyTbody);
        resultsGrid.appendChild(resultsTable);

        // 最初の追加時はactiveに
        if (tabs.querySelectorAll('.result-tab').length === 3) {
            tabs.querySelectorAll('.result-tab').forEach(t => t.classList.remove('active'));
            resTab.classList.add('active');
            Array.from(resultsGrid.children).forEach(tbl => (tbl as HTMLElement).style.display = 'none');
            resultsTable.style.display = '';
        }
    };
}

/**
 * 後方互換のためcreatingPanelAreaも残す（Vue移行前のコードから呼ばれる場合）
 */
export function createPanelArea() {
    setupPanelArea();
    return document.querySelector('.panel-area') as HTMLElement;
}
