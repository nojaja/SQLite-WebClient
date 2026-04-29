// splitter.js - 既存スプリッター要素にイベントを設定するモジュール

/**
 * 既存のスプリッター要素にイベントを設定する
 * @param splitter
 * @param sidebarElement
 */
export const attachSplitterEvents = (splitter: HTMLElement, sidebarElement: HTMLElement) => {
  splitter.addEventListener('mousedown', (e) => {
    e.preventDefault();
    /**
     *
     * @param e2
     */
    const onMouseMove = (e2) => {
      sidebarElement.style.width = `${e2.clientX}px`;
    };
    /**
     *
     */
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
    /**
     *
     * @param e2
     */
    const onTouchMove = (e2) => {
      if (e2.touches && e2.touches.length > 0) {
        sidebarElement.style.width = `${e2.touches[0].clientX}px`;
      }
    };
    /**
     *
     */
    const onTouchEnd = () => {
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
    document.addEventListener('touchmove', onTouchMove);
    document.addEventListener('touchend', onTouchEnd);
  });
};
