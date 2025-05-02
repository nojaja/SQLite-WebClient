import { test, expect } from '@playwright/test';

test('ホームページのタイトルが表示される', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/SQLClient - SQLite WASM/);
});

test('トリガー付き複数SQL文の動作確認', async ({ page }) => {
  await page.goto('/');

  const editor = page.locator('#sql-editor');
  // テーブル・トリガー作成と初期データ投入
  const sql = `
    CREATE TABLE log (text);
    CREATE TABLE stats (cnt);
    INSERT INTO stats VALUES(0);
    CREATE TABLE test (col1 INT, col2 INT);
    CREATE TRIGGER trg_test AFTER INSERT ON test
    BEGIN
      INSERT INTO log VALUES('inserted');
      UPDATE stats SET cnt = cnt + 1;
    END;
    INSERT INTO test VALUES(3,1);
  `;

  // SQLエディタにクエリを入力し実行（UI仕様に応じて適宜修正してください）
  await editor.fill(sql);
  await page.waitForTimeout(1000);
  await page.click('#run-button');
  await expect(page.locator('.status-success')).toHaveText("クエリ6を実行しました: 0 行に影響", { timeout: 15000 });
   
  // logテーブルに'inserted'が入っていることを確認
  await page.fill('#sql-editor', 'SELECT * FROM log;');
  await page.click('#run-button');
  await expect(page.locator('#results-grid')).toContainText('inserted');

  // statsテーブルのcntが1になっていることを確認
  await page.fill('#sql-editor', 'SELECT cnt FROM stats;');
  await page.click('#run-button');
  await expect(page.locator('#results-grid')).toContainText('1');
});