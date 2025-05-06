// messages-area（メッセージ表示エリア）を生成する関数
export function createMessagesArea() {
  const messagesArea = document.createElement('div');
  messagesArea.id = 'messages-area';
  messagesArea.classList.add('messages-area');
  messagesArea.style.display = '';
  return messagesArea;
}

// messages-areaの内容をセット
export function setMessages(msg) {
  const area = getMessagesArea();
  if (!area) return;
  if (Array.isArray(msg)) {
    area.innerHTML = msg.map(m => `<div>${m}</div>`).join('');
  } else {
    area.innerHTML = `<div>${msg}</div>`;
  }
}

// messages-area要素を取得
export function getMessagesArea() {
  return document.getElementById('messages-area');
}

// messages-areaを表示
export function showMessagesArea() {
  const area = getMessagesArea();
  if (area) area.style.display = '';
}

// messages-areaを非表示
export function hideMessagesArea() {
  const area = getMessagesArea();
  if (area) area.style.display = 'none';
}
