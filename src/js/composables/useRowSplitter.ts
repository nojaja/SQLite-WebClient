import { type Ref, onBeforeUnmount, onMounted } from 'vue';
import { useDragHandler } from './useDragHandler';

/**
 * クエリエディタ高さをマウス/タッチドラッグで変更するコンポーザブル
 * @param rowSplitterEl 水平スプリッター要素の Ref
 * @param getQueryEditor アクティブな query-editor 要素を返すゲッター関数
 */
export function useRowSplitter(
  rowSplitterEl: Ref<HTMLElement | null>,
  getQueryEditor: () => HTMLElement | null,
): void {
  let cleanupDrag: (() => void) | null = null;
  let cleanupStart: (() => void) | null = null;

  onMounted(() => {
    const el = rowSplitterEl.value;
    if (!el) return;

    const queryEditor = getQueryEditor();
    if (!queryEditor) return;

    let startY = 0;
    let startHeight = 0;

    /**
     * 処理名: ドラッグ開始ハンドラ
     * 処理概要: マウス/タッチダウン時に初期値を記録
     * 実装理由: Y座標と高さの開始値を保存してドラッグ計算に利用するため
      * @param clientY マウス/タッチのY座標
     */
    const setupDragStart = (clientY: number) => {
      startY = clientY;
      startHeight = queryEditor.getBoundingClientRect().height;
    };

    /**
     * 処理名: マウスダウンハンドラ
     * 処理概要: マウスダウン時に初期値を記録
     * 実装理由: ドラッグ開始値を設定するため
     * @param e マウスイベント
     */
    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      setupDragStart(e.clientY);
    };

    /**
     * 処理名: タッチスタートハンドラ
     * 処理概要: タッチ開始時に初期値を記録
     * 実装理由: ドラッグ開始値を設定するため
     * @param e タッチイベント
     */
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        setupDragStart(e.touches[0].clientY);
      }
    };

    /**
     * 処理名: ドラッグ移動時コールバック
     * 処理概要: ドラッグ操作時にエディタ高さを更新
     * 実装理由: マウス/タッチ統一的に処理するため
      * @param clientX マウス/タッチのX座標
      * @param clientY マウス/タッチのY座標
     */
    cleanupDrag = useDragHandler(el, (clientX, clientY) => {
      queryEditor.style.height = `${startHeight + clientY - startY}px`;
    });

    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('touchstart', onTouchStart);
    /**
     * 処理名: 開始イベント解除
     * 処理概要: ドラッグ開始時に使うイベントリスナを解除する
     * 実装理由: コンポーネント再生成時のイベント重複を防ぐため
     */
    cleanupStart = () => {
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('touchstart', onTouchStart);
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
