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

    /**
     * 処理名: マウスダウンハンドラ
     * 処理概要: マウスボタン押下時にドラッグを開始しクエリエディタの高さ変更を起動する
     * 実装理由: mousedown イベントにバインドしドラッグ操作を検出するため
     * @param e マウスイベント
     */
    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      const queryEditor = getQueryEditor();
      if (!queryEditor) return;
      const startY = e.clientY;
      const startHeight = queryEditor.getBoundingClientRect().height;
      /**
       * 処理名: マウスムーブハンドラ
       * 処理概要: マウス移動時にクエリエディタの高さを開始時の差分で更新する
       * 実装理由: mousemove イベントでリアルタイムに高さを更新するため
       * @param e2 マウスイベント
       */
      const onMouseMove = (e2: MouseEvent) => {
        queryEditor.style.height = `${startHeight + e2.clientY - startY}px`;
      };
      /**
       * 処理名: マウスアップハンドラ
       * 処理概要: マウスボタン解放時にイベントリスナを解除しドラッグを終了する
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
     * 処理概要: タッチ開始時にドラッグを起動しクエリエディタ高さの変更を始める
     * 実装理由: touchstart イベントでモバイルドラッグをサポートするため
     * @param e タッチイベント
     */
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const queryEditor = getQueryEditor();
      if (!e.touches.length || !queryEditor) return;
      const startY = e.touches[0].clientY;
      const startHeight = queryEditor.getBoundingClientRect().height;
      /**
       * 処理名: タッチムーブハンドラ
       * 処理概要: タッチ移動時にクエリエディタの高さをタッチ Y 座標の差分で更新する
       * 実装理由: touchmove イベントでリアルタイムに高さを更新するため
       * @param e2 タッチイベント
       */
      const onTouchMove = (e2: TouchEvent) => {
        if (e2.touches.length > 0) {
          queryEditor.style.height = `${startHeight + e2.touches[0].clientY - startY}px`;
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

    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('touchstart', onTouchStart);
    /**
     * 処理名: クリーンアップ関数設定
     * 処理概要: コンポーネントアンマウント時にスプリッターのイベントリスナを解除する
     * 実装理由: イベントリスナリークを防ぐためクリーンアップ局所変数に保存する
     */
    cleanupFn = () => {
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('touchstart', onTouchStart);
    };
  });

  onUnmounted(() => cleanupFn?.());
}
