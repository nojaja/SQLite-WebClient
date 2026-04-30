import { type Ref, onMounted, onUnmounted } from 'vue';

/**
 * クエリエディタ高さをマウス/タッチドラッグで変更するコンポーザブル
 * @param rowSplitterEl 水平スプリッター要素の Ref
 * @param getQueryEditor アクティブな query-editor 要素を返すゲッター関数
 */
export function useRowSplitter(
  rowSplitterEl: Ref<HTMLElement | null>,
  getQueryEditor: () => HTMLElement | null,
): void {
  let cleanupFn: (() => void) | null = null;

  onMounted(() => {
    const el = rowSplitterEl.value;
    if (!el) return;

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      const queryEditor = getQueryEditor();
      if (!queryEditor) return;
      const startY = e.clientY;
      const startHeight = queryEditor.getBoundingClientRect().height;
      const onMouseMove = (e2: MouseEvent) => {
        queryEditor.style.height = `${startHeight + e2.clientY - startY}px`;
      };
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const queryEditor = getQueryEditor();
      if (!e.touches.length || !queryEditor) return;
      const startY = e.touches[0].clientY;
      const startHeight = queryEditor.getBoundingClientRect().height;
      const onTouchMove = (e2: TouchEvent) => {
        if (e2.touches.length > 0) {
          queryEditor.style.height = `${startHeight + e2.touches[0].clientY - startY}px`;
        }
      };
      const onTouchEnd = () => {
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
      };
      document.addEventListener('touchmove', onTouchMove);
      document.addEventListener('touchend', onTouchEnd);
    };

    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('touchstart', onTouchStart);
    cleanupFn = () => {
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('touchstart', onTouchStart);
    };
  });

  onUnmounted(() => cleanupFn?.());
}
