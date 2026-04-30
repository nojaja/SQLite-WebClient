import { type Ref, onMounted, onUnmounted } from 'vue';

/**
 * サイドバー幅をマウス/タッチドラッグで変更するコンポーザブル
 * @param splitterEl スプリッター要素の Ref
 * @param getSidebarEl サイドバー要素を返すゲッター関数
 */
export function useColumnSplitter(
  splitterEl: Ref<HTMLElement | null>,
  getSidebarEl: () => HTMLElement | null | undefined,
): void {
  let cleanupFn: (() => void) | null = null;

  onMounted(() => {
    const splitter = splitterEl.value;
    if (!splitter) return;

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      const sidebar = getSidebarEl();
      if (!sidebar) return;
      const onMouseMove = (e2: MouseEvent) => {
        sidebar.style.width = `${e2.clientX}px`;
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
      const sidebar = getSidebarEl();
      if (!sidebar || !e.touches.length) return;
      const onTouchMove = (e2: TouchEvent) => {
        if (e2.touches.length > 0) {
          sidebar.style.width = `${e2.touches[0].clientX}px`;
        }
      };
      const onTouchEnd = () => {
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
      };
      document.addEventListener('touchmove', onTouchMove);
      document.addEventListener('touchend', onTouchEnd);
    };

    splitter.addEventListener('mousedown', onMouseDown);
    splitter.addEventListener('touchstart', onTouchStart);
    cleanupFn = () => {
      splitter.removeEventListener('mousedown', onMouseDown);
      splitter.removeEventListener('touchstart', onTouchStart);
    };
  });

  onUnmounted(() => cleanupFn?.());
}
