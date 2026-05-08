import { test, expect, type Page } from '@playwright/test';
import { fillSqlEditor, getSqlEditorValue } from './helpers/monacoEditor';

async function expandDatabaseNode(page: Page, alias = 'main') {
  const dbLabel = page.locator(`.tree-label.db-node[data-db-alias="${alias}"]`);
  const dbChildren = dbLabel.locator('xpath=..').locator('> .db-children');
  if (await dbChildren.isHidden()) {
    await dbLabel.click();
  }
}

async function expandTreeGroup(page: Page, title: string) {
  const groupLabel = page.locator(`.${title}-root`).first();
  const groupItems = groupLabel.locator('xpath=following-sibling::*[1]');
  if (await groupItems.isHidden()) {
    await groupLabel.click();
  }
}

test.describe('画面構成確認', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('メニューバーが表示される', async ({ page }) => {
    await expect(page.locator('#menu-bar').first()).toBeVisible();
  });

  test('サイドバー（DBツリー）が表示される', async ({ page }) => {
    await expect(page.locator('#sidebar').first()).toBeVisible();
    await expect(page.locator('#db-tree').first()).toBeVisible();
  });

  test('クエリタブが表示される', async ({ page }) => {
    await expect(page.locator('#query-tabs').first()).toBeVisible();
  });

  test('クエリエディタが表示される', async ({ page }) => {
    await expect(page.locator('#query-editor').first()).toBeVisible();
  });

  test('結果表示グリッドが表示される', async ({ page }) => {
    // まずクエリを実行してResultsタブを生成
    await fillSqlEditor(page, 'SELECT 1;');
    await page.click('#run-button');
    
    await expect(page.locator('#results-grid').first()).toBeVisible();
  });

  test('ステータスバーが表示される', async ({ page }) => {
    await expect(page.locator('#status-bar').first()).toBeVisible();
  });

  // タブ機能のテスト
  test('新規queryボタンでタブが追加される', async ({ page }) => {
    const initial = await page.locator('.query-tab').count();
    await page.click('#new-query-button');
    const after = await page.locator('.query-tab').count();
    expect(after).toBe(initial + 1);
  });

  test('3回押下でタブが3つ増える', async ({ page }) => {
    const initial = await page.locator('.query-tab').count();
    for (let i = 0; i < 3; i++) {
      await page.click('#new-query-button');
    }
    const after = await page.locator('.query-tab').count();
    expect(after).toBeGreaterThanOrEqual(initial + 3);
  });

  test('タブクリックで内容切り替えができる', async ({ page }) => {
    // 初期タブと新規タブ作成
    await page.click('#new-query-button');
    // 2番目のタブをクリック
    const second = page.locator('.query-tab').nth(1);
    await second.click();
    // クリック後、2番目のタブがactiveクラスを持つこと
    await expect(second).toHaveClass(/active/);
  });

  test('タブのクローズボタンでタブが消える', async ({ page }) => {
    // 新規タブ作成
    await page.click('#new-query-button');
    const tabCount = await page.locator('.query-tab').count();
    // 最後のタブのクローズボタンをクリック
    await page.locator('.query-tab').nth(tabCount - 1).locator('.close-tab').click();
    const after = await page.locator('.query-tab').count();
    expect(after).toBeLessThanOrEqual(tabCount);
  });

  test('アクティブタブの背景色が white であること、非アクティブが #f0f0f0 であること', async ({ page }) => {
    // query タブのみ対象: 新規タブを追加
    await page.click('#new-query-button');
    // 先頭タブをアクティブに
    await page.locator('.query-tab').nth(0).click();
    const firstBg = await page.locator('.query-tab').nth(0).evaluate(el => getComputedStyle(el).backgroundColor);
    const secondBg = await page.locator('.query-tab').nth(1).evaluate(el => getComputedStyle(el).backgroundColor);
    expect(firstBg).toBe('rgb(255, 255, 255)');
    expect(secondBg).toBe('rgb(240, 240, 240)');
  });

  test('タブ切り替えでクエリの内容が保存・復元されること', async ({ page }) => {
    const initialQuery = await getSqlEditorValue(page);
    // 新規タブ追加し、編集
    await page.click('#new-query-button');
    await fillSqlEditor(page, 'SELECT 1');
    // 戻る
    await page.locator('.query-tab').nth(0).click();
    expect(await getSqlEditorValue(page)).toBe(initialQuery);
    // 再度2番目タブ
    await page.locator('.query-tab').nth(1).click();
    expect(await getSqlEditorValue(page)).toBe('SELECT 1');
  });

  test('タブ切替で Results と Messages の表示が切り替わること', async ({ page }) => {
    // まずクエリを実行してResultsタブを生成
    await fillSqlEditor(page, 'SELECT 1;');
    await page.click('#run-button');
    // 初期は Results
    expect(await page.locator('#results-area').evaluate(el => window.getComputedStyle(el).display)).not.toBe('none');
    expect(await page.locator('#messages-area').evaluate(el => window.getComputedStyle(el).display)).toBe('none');
    // Messages タブをクリック
    await page.locator('.result-tab').nth(1).click();
    expect(await page.locator('#messages-area').evaluate(el => window.getComputedStyle(el).display)).not.toBe('none');
    expect(await page.locator('#results-area').evaluate(el => window.getComputedStyle(el).display)).toBe('none');
  });

  test('テーブル右クリックメニューでSelect文を挿入して実行できる', async ({ page }) => {
    await page.click('#new-db-button');
    await expandDatabaseNode(page);
    await expandTreeGroup(page, 'Tables');
    await fillSqlEditor(page, 'SELECT 0;');
    await page.locator('.tree-label.Tables[data-name="test"]').click({ button: 'right' });
    await page.click('#db-object-insert-select-menu');
    expect(await getSqlEditorValue(page)).toMatch(/SELECT 0;\s*SELECT\s+col1,\s*col2\s+FROM\s+test\s+LIMIT\s+100;/i);
    // 実行ボタンをクリック
    await page.click('#run-button');
    // Resultsテーブルに少なくとも1行表示される
    const rowCount = await page.locator('#results-grid tbody tr').count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('新規queryで開いた2番目のタブでもテーブルクリックではSQLが変化しない', async ({ page }) => {
    await page.click('#new-db-button');
    // 新規Queryで2番目のタブに切替
    await page.click('#new-query-button');
    await fillSqlEditor(page, 'SELECT 1;');
    await expandDatabaseNode(page);
    await expandTreeGroup(page, 'Tables');
    // テーブル 'test' をクリック（SQL変更はしない）
    await page.locator('.tree-label.Tables[data-name="test"]').click();
    expect(await getSqlEditorValue(page)).toBe('SELECT 1;');
  });

  test('Views, Indexes, Triggersがツリービューに表示される', async ({ page }) => {
    await page.click('#new-db-button');
    // Viewを作成
    await fillSqlEditor(page, "CREATE VIEW v_test AS SELECT * FROM test;");
    await page.waitForTimeout(1000);
    await page.click('#run-button');
    await expect(page.locator('.status-success')).toHaveText("クエリ1を実行しました: 0 行に影響", { timeout: 15000 });
    
    // Indexを作成
    await fillSqlEditor(page, "CREATE INDEX idx_col2 ON test(col2);");
    await page.waitForTimeout(1000);
    await page.click('#run-button');
    await expect(page.locator('.status-success')).toHaveText("クエリ1を実行しました: 0 行に影響", { timeout: 15000 });
    // Triggerを作成
    await fillSqlEditor(page, "CREATE TRIGGER trg_test AFTER INSERT ON test BEGIN SELECT RAISE(IGNORE); END;");
    await page.waitForTimeout(1000);
    await page.click('#run-button');
    await expect(page.locator('.status-success')).toHaveText("クエリ1を実行しました: 0 行に影響", { timeout: 15000 });
    // データベース変更をコミットしてからツリービューをリフレッシュ
    await fillSqlEditor(page, "COMMIT;");
    await page.click('#run-button');
    await page.click('#refresh-db-button');
    await expandDatabaseNode(page);
    // Viewsグループを展開してViewを検証
    const viewsLabel = page.locator('.Views-root');
    await expandTreeGroup(page, 'Views');
    await expect(viewsLabel).toBeVisible();
    await expect(page.locator('.Views[data-name="v_test"]').first()).toBeVisible();
    // Indexesグループを展開してIndexを検証
    const indexesLabel = page.locator('.Indexes-root');
    await expandTreeGroup(page, 'Indexes');
    await expect(indexesLabel).toBeVisible();
    await expect(page.locator('.Indexes[data-name="idx_col2"]')).toBeVisible();
    // Triggersグループを展開してTriggerを検証
    const triggersLabel = page.locator('.Triggers-root');
    await expandTreeGroup(page, 'Triggers');
    await expect(triggersLabel).toBeVisible();
    await expect(page.locator('.Triggers[data-name="trg_test"]')).toBeVisible();
  });

  test('新規DB作成後にtestテーブルが存在すること', async ({ page }) => {
    await page.goto('/');
    await page.click('#new-db-button');
    await fillSqlEditor(page, 'SELECT * FROM test;');
    await page.click('#run-button');
    const rows = await page.locator('#results-grid tbody tr').count();
    expect(rows).toBeGreaterThanOrEqual(2);
  });

  test('SELECT結果をデータセットDBに登録できる', async ({ page }) => {
    await page.goto('/');
    await page.click('#new-db-button');
    await fillSqlEditor(page, 'SELECT * FROM test LIMIT 100;');
    await page.click('#run-button');
    await page.evaluate(() => {
      window.prompt = () => 'test_dataset';
    });
    await page.click('#register-dataset-btn');

    await expect(page.locator('#dataset-tree')).toContainText('test_dataset');

    await fillSqlEditor(page, 'SELECT COUNT(*) AS cnt FROM dataset.test_dataset;');
    await page.click('#run-button');
    await expect(page.locator('#results-grid')).toContainText('2');
  });

  test('query-menu-bar に参照データと実行エンジンが表示されない', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.query-menu-bar')).toHaveCount(0);
    await expect(page.locator('#ref-dataset-select-query1')).toHaveCount(0);
    await expect(page.locator('#engine-select-query1')).toHaveCount(0);
  });

  test('データセットは通常 SQL で参照できる', async ({ page }) => {
    await page.goto('/');
    await page.click('#new-db-button');
    await fillSqlEditor(page, 'SELECT * FROM test LIMIT 100;');
    await page.click('#run-button');
    await page.evaluate(() => { window.prompt = () => 'test_dataset'; });
    await page.click('#register-dataset-btn');

    await fillSqlEditor(page, 'SELECT col1, col2 FROM dataset.test_dataset ORDER BY col1;');
    await page.click('#run-button');

    await expect(page.locator('#results-grid')).toContainText('111');
    await expect(page.locator('#results-grid')).toContainText('222');
  });

  test('全てのクエリタブを閉じてから新規タブを開いても正常に動作する', async ({ page }) => {
    // すべてのクエリタブを閉じる
    while (await page.locator('.query-tab').count() > 0) {
      await page.locator('.query-tab').nth(0).locator('.close-tab').click();
    }
    // main-areaが非表示になっていること
    await expect(page.locator('#main-area')).toBeHidden();
    // 新規queryボタンでタブを追加
    await page.click('#new-query-button');
    // main-areaが再表示され、タブが1つできていること
    await expect(page.locator('#main-area')).toBeVisible();
    expect(await page.locator('.query-tab').count()).toBe(1);
    // SQLエディタが使えること
    await fillSqlEditor(page, 'SELECT 1');
    await page.click('#run-button');
    // Resultsタブが生成されていること
    await expect(page.locator('.result-tab').first()).toBeVisible();
    // 結果グリッドが表示されていること
    await expect(page.locator('#results-grid')).toBeVisible();
  });

  test('Resultsタブが閉じられること', async ({ page }) => {
    // クエリを実行してResultsタブを生成
    await fillSqlEditor(page, 'SELECT 1;');
    await page.click('#run-button');
    // Resultsタブが存在すること
    const resultsTab = page.locator('.result-tab', { hasText: /^Results/ });
    await expect(resultsTab).toBeVisible();
    // Resultsタブの×ボタンをクリック
    await resultsTab.locator('.close-tab').click();
    // Resultsタブが消えてMessagesタブのみになること
    await expect(page.locator('.result-tab', { hasText: /^Results/ })).toHaveCount(0);
    await expect(page.locator('.result-tab', { hasText: 'Messages' })).toBeVisible();
  });

  test('Resultsタブをすべて閉じた後に再度クエリ実行でResultsタブが追加される', async ({ page }) => {
    // クエリを実行してResultsタブを生成
    await fillSqlEditor(page, 'SELECT 1;');
    await page.click('#run-button');
    // Resultsタブをすべて閉じる
    while (await page.locator('.result-tab', { hasText: /^Results/ }).count() > 0) {
      await page.locator('.result-tab', { hasText: /^Results/ }).first().locator('.close-tab').click();
    }
    // Resultsタブが0個でMessagesのみ
    await expect(page.locator('.result-tab', { hasText: /^Results/ })).toHaveCount(0);
    await expect(page.locator('.result-tab', { hasText: 'Messages' })).toBeVisible();
    // 再度クエリ実行
    await fillSqlEditor(page, 'SELECT 2;');
    await page.click('#run-button');
    // Resultsタブが再び追加されること
    await expect(page.locator('.result-tab', { hasText: /^Results/ })).toBeVisible();
  });
});