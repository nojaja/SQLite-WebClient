// splitter.js - スプリッター要素を作成するモジュール

export const createSplitter = (sidebarElement) => {
  const splitter = document.createElement('div');
  splitter.classList.add('splitter');

  splitter.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const onMouseMove = (e2) => {
      // sidebarElement を直接参照するように変更
      sidebarElement.style.width = `${e2.clientX}px`;
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  return splitter;
};
