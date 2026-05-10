/**
 * 処理名: ドラッグハンドラユーティリティ
 * 処理概要: マウスとタッチイベントをハンドルするドラッグハンドラ共通パターンを提供
 * 実装理由: 複数の splitter・resizer composables でタッチハンドラコードが重複するため、共通化して保守性を向上させるため
 * @param element ドラッグ対象のDOM要素
 * @param onMove マウス移動時のコールバック (clientX|clientY)
 * @returns イベント解除用クリーンアップ関数
 */
export const useDragHandler = (
  element: HTMLElement,
  onMove: (clientX: number, clientY: number) => void
): (() => void) => {

  /**
   * 処理名: マウスダウンハンドラ
   * 処理概要: マウスダウン時にmousemove/mouseupリスナを登録
   * 実装理由: ドラッグ開始時に全ドキュメント領域でマウス移動を追跡するため
   */
  const onMouseDown = () => {
    /**
     * 処理名: マウスムーブハンドラ
     * 処理概要: マウス移動時にコールバック関数を実行
     * 実装理由: リアルタイムにドラッグ位置をコールバック経由で通知するため
     * @param e2 マウスイベント
     */
    const onMouseMove = (e2: MouseEvent) => {
      onMove(e2.clientX, e2.clientY);
    };

    /**
     * 処理名: マウスアップハンドラ
     * 処理概要: マウスアップ時にイベントリスナを解除
     * 実装理由: ドラッグ終了時に不要なリスナをクリーンアップするため
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
   * 処理概要: タッチ開始時にtouchmove/touchendリスナを登録
   * 実装理由: ドラッグ開始時に全ドキュメント領域でタッチ移動を追跡するため
   * @param e タッチイベント
   */
  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 0) return;

    /**
     * 処理名: タッチムーブハンドラ
     * 処理概要: タッチ移動時にコールバック関数を実行
     * 実装理由: リアルタイムにドラッグ位置をコールバック経由で通知するため
     * @param e2 タッチイベント
     */
    const onTouchMove = (e2: TouchEvent) => {
      if (e2.touches.length > 0) {
        onMove(e2.touches[0].clientX, e2.touches[0].clientY);
      }
    };

    /**
     * 処理名: タッチエンドハンドラ
     * 処理概要: タッチ終了時にイベントリスナを解除
     * 実装理由: ドラッグ終了時に不要なリスナをクリーンアップするため
     */
    const onTouchEnd = () => {
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };

    document.addEventListener('touchmove', onTouchMove);
    document.addEventListener('touchend', onTouchEnd);
  };

  element.addEventListener('mousedown', onMouseDown);
  element.addEventListener('touchstart', onTouchStart);

  return () => {
    element.removeEventListener('mousedown', onMouseDown);
    element.removeEventListener('touchstart', onTouchStart);
  };
};
