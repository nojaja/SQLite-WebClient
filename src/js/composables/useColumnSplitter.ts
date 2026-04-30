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

    /**
     * 処理名: マウスダウンハンドラ
     * 処理概要: マウスボタン押下時にドラッグ開始しサイドバー幅のリサイズを起動する
     * 実装理由: mousedown イベントにバインドしドラッグ操作を検出するため
     * @param e マウスイベント
     */
    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      const sidebar = getSidebarEl();
      if (!sidebar) return;
      /**
       * 処理名: マウスムーブハンドラ
       * 処理概要: マウス移動時にサイドバーの幅をカーソル X 座標に合わせる
       * 実装理由: mousemove イベントでリアルタイムに幅を更新するため
       * @param e2 マウスイベント
       */
      const onMouseMove = (e2: MouseEvent) => {
        sidebar.style.width = `${e2.clientX}px`;
      };
      /**
       * 処理名: マウスアップハンドラ
       * 処理概要: マウスボタン解放時にドラッグ操作を終了しイベントリスナを解除する
       * 実装理由: mouseup 時にドラッグ状態をクリーンアップするため
       */
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    /**
     * 処理名: タッチスタートハンドラ
     * 処理概要: タッチ開始時にドラッグを起動しサイドバー幅のリサイズを始める
     * 実装理由: touchstart イベントでモバイルドラッグをサポートするため
     * @param e タッチイベント
     */
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const sidebar = getSidebarEl();
      if (!sidebar || !e.touches.length) return;
      /**
       * 処理名: タッチムーブハンドラ
       * 処理概要: タッチ移動時にサイドバーの幅をタッチ X 座標に合わせる
       * 実装理由: touchmove イベントでリアルタイムに幅を更新するため
       * @param e2 タッチイベント
       */
      const onTouchMove = (e2: TouchEvent) => {
        if (e2.touches.length > 0) {
          sidebar.style.width = `${e2.touches[0].clientX}px`;
        }
      };
      /**
       * 処理名: タッチエンドハンドラ
       * 処理概要: タッチ終了時にイベントリスナを解除しドラッグを終了する
       * 実装理由: touchend 時にドラッグ状態をクリーンアップするため
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
     * 処理名: クリーンアップ関数設定
     * 処理概要: コンポーネントアンマウント時にスプリッターのイベントリスナを解除する
     * 実装理由: イベントリスナリークを防ぐためクリーンアップ局所変数に保存する
     */
    cleanupFn = () => {
      splitter.removeEventListener('mousedown', onMouseDown);
      splitter.removeEventListener('touchstart', onTouchStart);
    };
  });

  onUnmounted(() => cleanupFn?.());
}
