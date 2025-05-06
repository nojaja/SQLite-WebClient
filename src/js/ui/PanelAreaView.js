// PanelAreaView.js
export function createPanelAreaView(activeAction) {

  const panelArea = document.createElement('div');
  panelArea.classList.add('panel-area');

  // Results/Messagesタブ
  const resultsTabs = document.createElement('div');
  resultsTabs.classList.add('results-tabs');

  panelArea.addTab = (label, id = null, addaction = null, removeaction = null) => {
    // 初期はMessagesタブのみ
    const newTab = document.createElement('div');
    newTab.classList.add('result-tab', 'active');
    newTab.textContent = label;
    newTab.dataset.resultsId = id || `results-table-${label}`;
    if (removeaction) {
      // closeボタン追加
      const close = document.createElement('span');
      close.classList.add('close-tab');
      close.textContent = '×';
      close.addEventListener('click', e => {
        e.stopPropagation();
        // タブ削除前に親を保持
        const tabsParent = resultsTabs;
        removeaction(label, id);
        newTab.remove();
        // 他のタブをアクティブ化（なければMessages）
        const remainTabs = Array.from(tabsParent.querySelectorAll('.result-tab')).filter(t => t !== newTab && t.textContent !== 'Messages');
        if (remainTabs.length > 0) {
          remainTabs[0].classList.add('active');
        }
      });
      newTab.appendChild(close);
    }
    if(addaction){
      addaction(resultsTabs,newTab);
    }else{
      resultsTabs.appendChild(newTab);
    }
    return newTab
  }

  resultsTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.result-tab');
    if (!tab) return;
    resultsTabs.querySelectorAll('.result-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeAction(tab, tab.dataset.resultsId);
  });


  panelArea.appendChild(resultsTabs);
  return panelArea;
}
