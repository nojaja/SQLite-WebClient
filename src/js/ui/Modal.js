// Modal生成・制御用のユーティリティ
export function createModal({ id, contentHtml }) {
    const modal = document.createElement('div');
    modal.id = id;
    modal.style.display = 'none';
    modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-content">
      ${contentHtml}
      <button id="close-${id}">閉じる</button>
    </div>
  `;
    document.body.appendChild(modal);
    // 閉じるイベント
    modal.querySelector(`#close-${id}`).addEventListener('click', () => {
        modal.style.display = 'none';
    });
    modal.querySelector('.modal-overlay').addEventListener('click', () => {
        modal.style.display = 'none';
    });

    modal.showModal = () => {
        modal.style.display = '';
    }
    modal.hideModal = () => {
        modal.style.display = 'none';
    }

    return modal;
}
