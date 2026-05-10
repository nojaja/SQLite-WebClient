import { type Ref, onBeforeUnmount, onMounted } from 'vue';
import { useDragHandler } from './useDragHandler';

interface SidebarRowSplitterOptions {
  minTopHeight?: number;
  minBottomHeight?: number;
}

/**
 * サイドバー内の上下ペイン境界をドラッグで変更するコンポーザブル
 * @param splitterEl 行スプリッター要素の Ref
 * @param getContainerEl サイドバーコンテナ要素を返すゲッター関数
 * @param getTopPaneEl 上段ペイン要素を返すゲッター関数
 * @param options 上段・下段の最小高さオプション
 */
export function useSidebarRowSplitter(
  splitterEl: Ref<HTMLElement | null>,
  getContainerEl: () => HTMLElement | null | undefined,
  getTopPaneEl: () => HTMLElement | null | undefined,
  options: SidebarRowSplitterOptions = {},
): void {
  let cleanupDrag: (() => void) | null = null;
  let cleanupStart: (() => void) | null = null;
  const minTopHeight = options.minTopHeight ?? 160;
  const minBottomHeight = options.minBottomHeight ?? 160;

  /**
   * 処理名: 上段高さ適用
   * 処理概要: サイドバー高さと最小値制約を考慮して上段ペイン高さを適用する
   * 実装理由: ドラッグ時に上下領域が潰れないよう安全にクランプするため
   * @param topPane 上段ペイン要素
   * @param container サイドバー要素
   * @param splitter スプリッター要素
   * @param requestedHeight 希望する上段高さ(px)
   */
  const applyTopPaneHeight = (
    topPane: HTMLElement,
    container: HTMLElement,
    splitter: HTMLElement,
    requestedHeight: number,
  ): void => {
    const splitterHeight = splitter.getBoundingClientRect().height || 5;
    const containerHeight = container.getBoundingClientRect().height;
    const maxTopHeight = Math.max(minTopHeight, containerHeight - minBottomHeight - splitterHeight);
    const clampedHeight = Math.min(Math.max(requestedHeight, minTopHeight), maxTopHeight);
    topPane.style.flexBasis = `${Math.round(clampedHeight)}px`;
  };

  onMounted(() => {
    const splitter = splitterEl.value;
    if (!splitter) return;

    const container = getContainerEl();
    const topPane = getTopPaneEl();
    if (!container || !topPane) return;

    let startY = 0;
    let startHeight = 0;

    /**
     * 処理名: マウスダウンハンドラ
     * 処理概要: マウスダウン時に初期値を記録
     * 実装理由: ドラッグ開始値を設定するため
     * @param e マウスイベント
     */
    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      startY = e.clientY;
      startHeight = topPane.getBoundingClientRect().height;
    };

    /**
     * 処理名: タッチスタートハンドラ
     * 処理概要: タッチ開始時に初期値を記録
     * 実装理由: ドラッグ開始値を設定するため
     * @param e タッチイベント
     */
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 0) return;
      startY = e.touches[0].clientY;
      startHeight = topPane.getBoundingClientRect().height;
    };

    /**
     * 処理名: ドラッグ移動時コールバック
     * 処理概要: ドラッグ操作時にペイン高さを更新
     * 実装理由: マウス/タッチ統一的に処理するため
     */
    cleanupDrag = useDragHandler(splitter, (clientX, clientY) => {
      applyTopPaneHeight(topPane, container, splitter, startHeight + clientY - startY);
    });

    splitter.addEventListener('mousedown', onMouseDown);
    splitter.addEventListener('touchstart', onTouchStart);
    /**
     * 処理名: 開始イベント解除
     * 処理概要: ドラッグ開始時に使うイベントリスナを解除する
     * 実装理由: コンポーネント再生成時のイベント重複を防ぐため
     */
    cleanupStart = () => {
      splitter.removeEventListener('mousedown', onMouseDown);
      splitter.removeEventListener('touchstart', onTouchStart);
    };
  });

  /**
   * 処理名: アンマウントクリーンアップ
   * 処理概要: ドラッグ関連リスナを解除する
   * 実装理由: コンポーネント破棄時のイベントリークを防ぐため
   */
  onBeforeUnmount(() => {
    cleanupDrag?.();
    cleanupDrag = null;
    cleanupStart?.();
    cleanupStart = null;
  });
}
