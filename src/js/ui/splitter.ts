// splitter.js - スプリッター要素を作成するモジュール

export const createSplitter = (sidebarElement) => {
  const splitter = document.createElement('div');
  splitter.classList.add('splitter');
  attachSplitterEvents(splitter, sidebarElement);
  return splitter;
};

// 既存のスプリッター要素にイベントを設定する（Vue移行後に使用）
export const attachSplitterEvents = (splitter: HTMLElement, sidebarElement: HTMLElement) => {
  splitter.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const onMouseMove = (e2) => {
      sidebarElement.style.width = `${e2.clientX}px`;
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  // タッチ操作対応
  splitter.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const onTouchMove = (e2) => {
      if (e2.touches && e2.touches.length > 0) {
        sidebarElement.style.width = `${e2.touches[0].clientX}px`;
      }
    };
    const onTouchEnd = () => {
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
    document.addEventListener('touchmove', onTouchMove);
    document.addEventListener('touchend', onTouchEnd);
  });
};
