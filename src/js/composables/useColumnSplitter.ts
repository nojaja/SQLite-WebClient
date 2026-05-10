import { type Ref, onBeforeUnmount, onMounted } from 'vue';
import { useDragHandler } from './useDragHandler';

/**
 * サイドバー幅をマウス/タッチドラッグで変更するコンポーザブル
 * @param splitterEl スプリッター要素の Ref
 * @param getSidebarEl サイドバー要素を返すゲッター関数
 */
export function useColumnSplitter(
  splitterEl: Ref<HTMLElement | null>,
  getSidebarEl: () => HTMLElement | null | undefined,
): void {
  let cleanupDrag: (() => void) | null = null;

  onMounted(() => {
    const splitter = splitterEl.value;
    if (!splitter) return;

    const sidebar = getSidebarEl();
    if (!sidebar) return;

    /**
     * 処理名: ドラッグコールバック
     * 処理概要: ドラッグ操作時にサイドバー幅を X 座標で更新
     * 実装理由: マウス/タッチ双方のドラッグを統一的に処理するため
     */
    cleanupDrag = useDragHandler(splitter, (clientX) => {
      sidebar.style.width = `${clientX}px`;
    });
  });

  onBeforeUnmount(() => {
    cleanupDrag?.();
    cleanupDrag = null;
  });
}
