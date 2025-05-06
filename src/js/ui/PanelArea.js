// PanelArea.js
import { UI_IDS } from './constants.js';
import * as PanelAreaView from './PanelAreaView.js';
import * as ResultsArea from './ResultsArea.js';
import * as MessagesArea from './MessagesArea.js';
import { showError, showSuccess } from './StatusBar.js';

// panel-area（results-tabs, results-area, messages-areaをまとめてラップ）を生成する関数
export function createPanelArea() {
    const panelArea = PanelAreaView.createPanelAreaView(
        // タブ切り替え時のアクションを定義
        (tab, resultsId) => {
            const resultsMenuBar = document.querySelector('.results-menu-bar');
            const resultsGrid = document.getElementById(UI_IDS.RESULTS_GRID);
            if (tab.textContent === 'Messages') {
                ResultsArea.hideResultsArea();
                MessagesArea.showMessagesArea();
                if (resultsMenuBar) resultsMenuBar.style.display = 'none';
            } else {
                ResultsArea.showResultsArea();
                MessagesArea.hideMessagesArea();
                if (resultsMenuBar) resultsMenuBar.style.display = 'flex';
                
                // resultsGrid内のtableのみ切り替え
                Array.from(resultsGrid.children).forEach(tbl => {
                    tbl.style.display = (tbl.id === tab.dataset.resultsId) ? '' : 'none';
                });
            }

        }
    );

    // Results/Messagesタブを追加する関数
    function addMessagesTab() {
        return panelArea.addTab('Messages', 'messages-area');
    }

    addMessagesTab(); // Messagesタブを追加

    // 複数Resultsタブ・テーブル追加用
    window.addResults = (label, tableId = null) => {
        const tabs = document.querySelector('.results-tabs');
        const resultsGrid = document.getElementById(UI_IDS.RESULTS_GRID);
        if (!panelArea || !resultsGrid) return null;

        //ResultsSectionController.addResultsTab(panelArea, resultsGrid, label, tableId);
        const resTab = panelArea.addTab(label, tableId,
            (resultsTabs,newTab) => {
                //タブ追加時の処理
                const msgTab = tabs.querySelector('.result-tab:last-child');
                const resultsMenuBar = document.querySelector('.results-menu-bar');
                if (resultsMenuBar) resultsMenuBar.style.display = 'flex';
                resultsTabs.insertBefore(newTab, msgTab);
            },
            (label, id) => {
                //タブ削除時の処理
                // 他のタブをアクティブ化（なければMessages）
                const remainTabs = Array.from(tabs.querySelectorAll('.result-tab')).filter(t => {console.log(t); return t !== resTab && t.textContent !== 'Messages'});
                if (remainTabs.length > 0) {
                    remainTabs[0].classList.add('active');
                    MessagesArea.hideMessagesArea();
                    ResultsArea.showResultsArea();
                }else {
                    const msgTab = tabs.querySelector('.result-tab:last-child');
                    if (msgTab) msgTab.classList.add('active');
                    MessagesArea.showMessagesArea();
                    ResultsArea.hideResultsArea();
                }
            });
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
            Array.from(resultsGrid.children).forEach(tbl => tbl.style.display = 'none');
            resultsTable.style.display = '';
        }

    }

    setTimeout(() => ResultsArea.setupRegisterDatasetHandler({ showSuccess, showError }), 0);

    // results-area部分をResultsArea.jsから生成
    const { resultsArea, resultsGrid, resultsMenuBar } = ResultsArea.createResultsArea();

    // messages-area部分をMessagesArea.jsから生成
    const messagesArea = MessagesArea.createMessagesArea();

    panelArea.appendChild(resultsArea);
    panelArea.appendChild(messagesArea);
    return panelArea;
}
