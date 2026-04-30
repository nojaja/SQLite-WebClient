import { type Page } from '@playwright/test';

/**
 * 処理名: SQLエディタへの値設定
 * 処理概要: window.__sqlEditorBridge を通じて Monaco エディタに値をセットする
 * 実装理由: Monaco エディタは textarea ではないため page.fill が使えないため
 * @param page Playwright の Page オブジェクト
 * @param value 設定する SQL 文字列
 */
export async function fillSqlEditor(page: Page, value: string): Promise<void> {
  await page.evaluate((v: string) => {
    window.__sqlEditorBridge.setValue(v);
  }, value);
}

/**
 * 処理名: SQLエディタの値取得
 * 処理概要: window.__sqlEditorBridge を通じて Monaco エディタの現在値を取得する
 * 実装理由: Monaco エディタは textarea ではないため inputValue が使えないため
 * @param page Playwright の Page オブジェクト
 * @returns エディタの現在の SQL 文字列
 */
export async function getSqlEditorValue(page: Page): Promise<string> {
  return page.evaluate(() => window.__sqlEditorBridge.getValue());
}
