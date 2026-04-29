// rowSplitter.js - 水平スプリッター要素を作成するモジュール

let currentQueryEditor = null;

export const createRowSplitter = () => {
  const rowSplitter = document.createElement('div');
  rowSplitter.classList.add('row-splitter');

  // ドラッグ時のqueryEditorElementを都度取得
  rowSplitter.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const queryEditorElement = currentQueryEditor || document.querySelector('.query-area.active .query-editor');
    if (!queryEditorElement) return;
    const startY = e.clientY;
    const startHeight = queryEditorElement.getBoundingClientRect().height;
    const onMouseMove = (e2) => {
      const dy = e2.clientY - startY;
      queryEditorElement.style.height = `${startHeight + dy}px`;
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  // タッチ操作対応
  rowSplitter.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const queryEditorElement = currentQueryEditor || document.querySelector('.query-area.active .query-editor');
    if (!e.touches || e.touches.length === 0 || !queryEditorElement) return;
    const startY = e.touches[0].clientY;
    const startHeight = queryEditorElement.getBoundingClientRect().height;
    const onTouchMove = (e2) => {
      if (e2.touches && e2.touches.length > 0) {
        const dy = e2.touches[0].clientY - startY;
        queryEditorElement.style.height = `${startHeight + dy}px`;
      }
    };
    const onTouchEnd = () => {
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
    document.addEventListener('touchmove', onTouchMove);
    document.addEventListener('touchend', onTouchEnd);
  });

  // アクティブなquery-editorをセット
  rowSplitter.setQueryEditor = (editorElem) => {
    currentQueryEditor = editorElem;
  };

  return rowSplitter;
};
