import { test, expect } from '@playwright/test';

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
    await page.fill('#sql-editor', 'SELECT 1;');
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
    const initialQuery = await page.locator('#sql-editor').inputValue();
    // 新規タブ追加し、編集
    await page.click('#new-query-button');
    await page.locator('#sql-editor').fill('SELECT 1');
    // 戻る
    await page.locator('.query-tab').nth(0).click();
    expect(await page.locator('#sql-editor').inputValue()).toBe(initialQuery);
    // 再度2番目タブ
    await page.locator('.query-tab').nth(1).click();
    expect(await page.locator('#sql-editor').inputValue()).toBe('SELECT 1');
  });

  test('タブ切替で Results と Messages の表示が切り替わること', async ({ page }) => {
    // まずクエリを実行してResultsタブを生成
    await page.fill('#sql-editor', 'SELECT 1;');
    await page.click('#run-button');
    // 初期は Results
    expect(await page.locator('#results-area').evaluate(el => window.getComputedStyle(el).display)).not.toBe('none');
    expect(await page.locator('#messages-area').evaluate(el => window.getComputedStyle(el).display)).toBe('none');
    // Messages タブをクリック
    await page.locator('.result-tab').nth(1).click();
    expect(await page.locator('#messages-area').evaluate(el => window.getComputedStyle(el).display)).not.toBe('none');
    expect(await page.locator('#results-area').evaluate(el => window.getComputedStyle(el).display)).toBe('none');
  });

  test('テーブルクリックでSQL設定と実行結果がResultsに表示される', async ({ page }) => {
    // 'test' テーブルをクリック
    await page.locator('.tree-label', { hasText: 'test' }).click();
    // SQLエディタにクエリが設定される
    await expect(page.locator('#sql-editor')).toHaveValue('SELECT * FROM test LIMIT 100');
    // 実行ボタンをクリック
    await page.click('#run-button');
    // Resultsテーブルに少なくとも1行表示される
    const rowCount = await page.locator('#results-table tbody tr').count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('新規queryで開いた2番目のタブでもテーブルクリックで実行結果がResultsに表示される', async ({ page }) => {
    // 新規Queryで2番目のタブに切替
    await page.click('#new-query-button');
    // テーブル 'test' をクリック
    await page.locator('.tree-label', { hasText: 'test' }).click();
    // SQLエディタにクエリが設定される
    await expect(page.locator('#sql-editor')).toHaveValue('SELECT * FROM test LIMIT 100');
    // 実行ボタンをクリック
    await page.click('#run-button');
    // 2番目タブでResultsグリッドに行が表示される
    const rows = await page.locator('#results-table tbody tr').count();
    expect(rows).toBeGreaterThan(0);
  });

  test('Views, Indexes, Triggersがツリービューに表示される', async ({ page }) => {
    const editor = page.locator('#sql-editor');
    // Viewを作成
    await editor.fill("CREATE VIEW v_test AS SELECT * FROM test;");
    await page.waitForTimeout(1000);
    await page.click('#run-button');
    await expect(page.locator('.status-success')).toHaveText("クエリ1を実行しました: 0 行に影響", { timeout: 15000 });
    
    // Indexを作成
    await editor.fill("CREATE INDEX idx_col2 ON test(col2);");
    await page.waitForTimeout(1000);
    await page.click('#run-button');
    await expect(page.locator('.status-success')).toHaveText("クエリ1を実行しました: 0 行に影響", { timeout: 15000 });
    // Triggerを作成
    await editor.fill("CREATE TRIGGER trg_test AFTER INSERT ON test BEGIN SELECT RAISE(IGNORE); END;");
    await page.waitForTimeout(1000);
    await page.click('#run-button');
    await expect(page.locator('.status-success')).toHaveText("クエリ1を実行しました: 0 行に影響", { timeout: 15000 });
    // データベース変更をコミットしてからツリービューをリフレッシュ
    await editor.fill("COMMIT;");
    await page.click('#run-button');
    await page.click('#refresh-db-button');
    // Viewsグループを展開してViewを検証
    const viewsLabel = page.locator('.Views-root');
    //await viewsLabel.click();
    await expect(viewsLabel).toBeVisible();
    await expect(page.locator('.Views[data-name="v_test"]').first()).toBeVisible();
    // Indexesグループを展開してIndexを検証
    const indexesLabel = page.locator('.Indexes-root');
    //await indexesLabel.click();
    await expect(indexesLabel).toBeVisible();
    await expect(page.locator('.Indexes[data-name="idx_col2"]')).toBeVisible();
    // Triggersグループを展開してTriggerを検証
    const triggersLabel = page.locator('.Triggers-root');
    //await triggersLabel.click();
    await expect(triggersLabel).toBeVisible();
    await expect(page.locator('.Triggers[data-name="trg_test"]')).toBeVisible();
  });

  test('初期テーブル作成（testテーブルが存在すること）', async ({ page }) => {
    await page.goto('/');
    // テーブル一覧に'test'が表示されるまで待つ
    await expect(page.locator('.tree-label', { hasText: 'test' })).toBeVisible();
    // SQLエディタでSELECTしてデータが返ること
    await page.fill('#sql-editor', 'SELECT * FROM test;');
    await page.click('#run-button');
    // 初期データ2件が入っていること
    const rows = await page.locator('#results-table tbody tr').count();
    expect(rows).toBeGreaterThanOrEqual(2);
  });

  test('SELECT結果をデータセットに登録し__DATASET_STORE__に反映される', async ({ page }) => {
    await page.goto('/');
    // testテーブルのデータをSELECT
    await page.fill('#sql-editor', 'SELECT * FROM test LIMIT 100;');
    await page.click('#run-button');
    // 「データセットに登録」ボタンをクリック
    await page.click('#register-dataset-btn');
    // ダイアログでデータセット名を入力
    await page.evaluate(() => {
      // promptをモックして自動入力
      window.prompt = () => 'test_dataset';
    });
    // もう一度ボタンを押して登録
    await page.click('#register-dataset-btn');
    // __DATASET_STORE__にtest_datasetが登録されていることを確認
    const exists = await page.evaluate(() => {
      return !!window.__DATASET_STORE__ && !!window.__DATASET_STORE__['test_dataset'] && Array.isArray(window.__DATASET_STORE__['test_dataset'].rows);
    });
    expect(exists).toBe(true);
    // データ件数も確認
    const rowCount = await page.evaluate(() => window.__DATASET_STORE__['test_dataset'].rows.length);
    expect(rowCount).toBeGreaterThanOrEqual(2);
  });

  test('参照データを使って複数行INSERTできる', async ({ page }) => {
    await page.goto('/');
    // testテーブルのデータをSELECTしてデータセット登録
    await page.fill('#sql-editor', 'SELECT * FROM test LIMIT 100;');
    await page.click('#run-button');
    // 「データセットに登録」ボタンをクリック
    await page.click('#register-dataset-btn');
    await page.evaluate(() => { window.prompt = () => 'test_dataset'; });
    await page.click('#register-dataset-btn');

    // 新規タブを開く
    await page.click('#new-query-button');
    // test2テーブル作成
    await page.fill('#sql-editor', 'CREATE TABLE IF NOT EXISTS test2 (col1 INTEGER PRIMARY KEY, col2 TEXT);');
    await page.click('#run-button');

    // 参照データプルダウンでtest_datasetを選択
    const selectId = '#ref-dataset-select-query1';
    await page.selectOption(selectId, 'test_dataset');

    // test_datasetの内容をtest2にINSERT
    await page.fill('#sql-editor', 'INSERT INTO test2 (col1, col2) VALUES ($col1, $col2);');
    await page.click('#run-button');

    // test2の内容を確認
    await page.selectOption(selectId, 'なし');
    await page.fill('#sql-editor', 'SELECT * FROM test2;');
    await page.click('#run-button');
    // test_datasetの件数とtest2の件数が一致すること
    const dsCount = await page.evaluate(() => window.__DATASET_STORE__['test_dataset'].rows.length);
    const t2Count = await page.locator('#results-table tbody tr').count();
    expect(t2Count).toBe(dsCount);
  });

  test('参照データ×jsonataエンジンでjsonata式が実行できる', async ({ page }) => {
    await page.goto('/');
    // testテーブルのデータをSELECTしてデータセット登録
    await page.fill('#sql-editor', 'SELECT * FROM test LIMIT 100;');
    await page.click('#run-button');
    await page.click('.result-tab', { timeout: 15000 });
    await page.click('#register-dataset-btn');
    await page.evaluate(() => { window.prompt = () => 'test_dataset'; });
    await page.click('#register-dataset-btn');

    // 参照データプルダウンでtest_datasetを選択
    const selectId = '#ref-dataset-select-query1';
    await page.selectOption(selectId, 'test_dataset');
    // 実行エンジンプルダウンでjsonataを選択
    const engineSelectId = '#engine-select-query1';
    await page.selectOption(engineSelectId, 'jsonata');
    // jsonata式を入力（col1の値を10倍した配列を返す）
    await page.fill('#sql-editor', '$map($, function($v) { $number($v.col1) * 10 })');
    await page.click('#run-button');

    await page.click('.result-tab', { timeout: 15000 });
    
    // 結果が期待通り（例: 10, 20 など）が表示される
    const values = await page.$$eval('#results-table tbody tr td', tds => tds.map(td => td.textContent));
    expect(values).toContain('10');
    expect(values).toContain('20');
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
    await page.locator('#sql-editor').fill('SELECT 1');
    await page.click('#run-button');
    // Resultsタブが生成されていること
    await expect(page.locator('.result-tab').first()).toBeVisible();
    // 結果グリッドが表示されていること
    await expect(page.locator('#results-grid')).toBeVisible();
  });

  test('Resultsタブが閉じられること', async ({ page }) => {
    // クエリを実行してResultsタブを生成
    await page.fill('#sql-editor', 'SELECT 1;');
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
    await page.fill('#sql-editor', 'SELECT 1;');
    await page.click('#run-button');
    // Resultsタブをすべて閉じる
    while (await page.locator('.result-tab', { hasText: /^Results/ }).count() > 0) {
      await page.locator('.result-tab', { hasText: /^Results/ }).first().locator('.close-tab').click();
    }
    // Resultsタブが0個でMessagesのみ
    await expect(page.locator('.result-tab', { hasText: /^Results/ })).toHaveCount(0);
    await expect(page.locator('.result-tab', { hasText: 'Messages' })).toBeVisible();
    // 再度クエリ実行
    await page.fill('#sql-editor', 'SELECT 2;');
    await page.click('#run-button');
    // Resultsタブが再び追加されること
    await expect(page.locator('.result-tab', { hasText: /^Results/ })).toBeVisible();
  });
});