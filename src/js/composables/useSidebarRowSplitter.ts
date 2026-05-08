import { type Ref, onMounted, onUnmounted } from 'vue';

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
  let cleanupFn: (() => void) | null = null;
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

    /**
     * 処理名: マウスドラッグ開始
     * 処理概要: マウスダウン時に上下ペインのリサイズドラッグを開始する
     * 実装理由: PC操作でスプリッター移動に追従して高さを更新するため
     * @param e マウスイベント
     */
    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      const container = getContainerEl();
      const topPane = getTopPaneEl();
      if (!container || !topPane) return;
      const startY = e.clientY;
      const startHeight = topPane.getBoundingClientRect().height;

      /**
       * 処理名: マウス移動中高さ更新
       * 処理概要: 開始位置との差分で上段ペインの高さを更新する
       * 実装理由: ドラッグ中にリアルタイムで上下境界を反映するため
       * @param e2 マウスイベント
       */
      const onMouseMove = (e2: MouseEvent) => {
        applyTopPaneHeight(topPane, container, splitter, startHeight + e2.clientY - startY);
      };

      /**
       * 処理名: マウスドラッグ終了
       * 処理概要: mousemove/mouseup リスナを解除する
       * 実装理由: ドラッグ終了後の不要なイベント監視を防ぐため
       */
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    /**
     * 処理名: タッチドラッグ開始
     * 処理概要: タッチ開始時に上下ペインのリサイズドラッグを開始する
     * 実装理由: モバイル/タブレット操作でもスプリッター移動を可能にするため
     * @param e タッチイベント
     */
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const container = getContainerEl();
      const topPane = getTopPaneEl();
      if (!container || !topPane || e.touches.length === 0) return;
      const startY = e.touches[0].clientY;
      const startHeight = topPane.getBoundingClientRect().height;

      /**
       * 処理名: タッチ移動中高さ更新
       * 処理概要: タッチ開始位置との差分で上段ペインの高さを更新する
       * 実装理由: タッチドラッグ中にリアルタイムで上下境界を反映するため
       * @param e2 タッチイベント
       */
      const onTouchMove = (e2: TouchEvent) => {
        if (e2.touches.length === 0) return;
        applyTopPaneHeight(topPane, container, splitter, startHeight + e2.touches[0].clientY - startY);
      };

      /**
       * 処理名: タッチドラッグ終了
       * 処理概要: touchmove/touchend リスナを解除する
       * 実装理由: タッチ終了後の不要なイベント監視を防ぐため
       */
      const onTouchEnd = () => {
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
      };

      document.addEventListener('touchmove', onTouchMove);
      document.addEventListener('touchend', onTouchEnd);
    };

    splitter.addEventListener('mousedown', onMouseDown);
    splitter.addEventListener('touchstart', onTouchStart);

    /**
     * 処理名: スプリッター監視解除設定
     * 処理概要: アンマウント時に開始イベントリスナを解除する
     * 実装理由: コンポーネント破棄後のリークを防止するため
     */
    cleanupFn = () => {
      splitter.removeEventListener('mousedown', onMouseDown);
      splitter.removeEventListener('touchstart', onTouchStart);
    };
  });

  onUnmounted(() => cleanupFn?.());
}
