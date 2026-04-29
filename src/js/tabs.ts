export function initTabs() {
  const container = document.getElementById('query-tabs');
  if (!container) return;
  // タブクリック切り替えとクローズを一括バインド
  container.addEventListener('click', (e) => {
    const tab = e.target.closest('.query-tab');
    if (!tab) return;
    // クローズボタンクリック
    if (e.target.classList.contains('close-tab')) {
      e.stopPropagation();
      tab.remove();
      return;
    }
    // タブ切り替え
    container.querySelectorAll('.query-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
  });
}

export function addTab(label) {
  const container = document.getElementById('query-tabs');
  if (!container) return;
  const count = container.querySelectorAll('.query-tab').length;
  const tabId = `query${count + 1}`;
  const tab = document.createElement('div');
  tab.classList.add('query-tab');
  tab.dataset.tabId = tabId;
  tab.textContent = `${label}${count + 1}`;
  const close = document.createElement('span');
  close.classList.add('close-tab');
  close.textContent = '×';
  tab.appendChild(close);
  container.appendChild(tab);
}