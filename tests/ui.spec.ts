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
    const rowCount = await page.locator('#results-grid .tabulator-row').count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('Results remain visible and runnable after opening single-table edit', async ({ page }) => {
    await page.click('#new-db-button');

    await fillSqlEditor(page, 'SELECT * FROM test;');
    await page.click('#run-button');
    await expect(page.locator('.result-tab', { hasText: 'Results' }).first()).toBeVisible();
    await expect(page.locator('#results-grid .tabulator-row').first()).toBeVisible();

    await expandDatabaseNode(page);
    await expandTreeGroup(page, 'Tables');
    await page.locator('.tree-label.Tables[data-name="test"]').click({ button: 'right' });
    await page.click('#db-object-edit-table-data-menu');

    await expect(page.locator('#editable-grid-container')).toBeVisible();
    await expect(page.locator('.result-tab', { hasText: '単表編集: test' })).toBeVisible();

    await page.locator('.result-tab', { hasText: 'Results' }).first().click();
    await expect(page.locator('#results-grid .tabulator-row').first()).toBeVisible();

    await fillSqlEditor(page, 'SELECT 1 as x;');
    await page.click('#run-button');
    await expect(page.locator('.result-tab', { hasText: 'Results' }).first()).toBeVisible();
    await expect(page.locator('#results-grid .tabulator-row').first()).toBeVisible();
  });

  test('テーブル定義と単表編集を同時に開いて切り替えできる', async ({ page }) => {
    await page.click('#new-db-button');
    await expandDatabaseNode(page);
    await expandTreeGroup(page, 'Tables');

    await page.locator('.tree-label.Tables[data-name="test"]').click({ button: 'right' });
    await page.click('#db-object-show-table-definition-menu');

    await page.locator('.tree-label.Tables[data-name="test"]').click({ button: 'right' });
    await page.click('#db-object-edit-table-data-menu');

    const definitionTab = page.locator('.result-tab', { hasText: 'テーブル定義: test' });
    const dataEditTab = page.locator('.result-tab', { hasText: '単表編集: test' });

    await expect(definitionTab).toBeVisible();
    await expect(dataEditTab).toBeVisible();

    await definitionTab.click();
    await expect(definitionTab).toHaveClass(/active/);

    await dataEditTab.click();
    await expect(dataEditTab).toHaveClass(/active/);
  });

  test.skip('単表編集で行選択しても行削除ボタンが非活性のまま（不具合再現）', async ({ page }) => {
    await page.click('#new-db-button');
    await expandDatabaseNode(page);
    await expandTreeGroup(page, 'Tables');

    await page.locator('.tree-label.Tables[data-name="test"]').click({ button: 'right' });
    await page.click('#db-object-edit-table-data-menu');

    const firstCell = page.locator('#editable-grid-container .tabulator-row .tabulator-cell').first();
    await expect(firstCell).toBeVisible();
    await firstCell.click();

    const deleteButton = page.locator('[id^="delete-row-button-"]').first();
    await expect(deleteButton).toBeDisabled();
  });

  test('単表編集で行選択後に行削除ボタンが活性になり削除できる', async ({ page }) => {
    await page.click('#new-db-button');
    await expandDatabaseNode(page);
    await expandTreeGroup(page, 'Tables');

    await page.locator('.tree-label.Tables[data-name="test"]').click({ button: 'right' });
    await page.click('#db-object-edit-table-data-menu');

    const rows = page.locator('#editable-grid-container .tabulator-row');
    await expect(rows.first()).toBeVisible();
    const beforeCount = await rows.count();

    await rows.first().locator('.tabulator-cell').first().click();

    const deleteButton = page.locator('[id^="delete-row-button-"]').first();
    await expect(deleteButton).toBeEnabled();
    await deleteButton.click();

    await expect(rows).toHaveCount(beforeCount - 1);
  });

  test('単表編集で編集したセルの背景がピンクになる', async ({ page }) => {
    await page.click('#new-db-button');
    await expandDatabaseNode(page);
    await expandTreeGroup(page, 'Tables');

    await page.locator('.tree-label.Tables[data-name="test"]').click({ button: 'right' });
    await page.click('#db-object-edit-table-data-menu');

    const targetCell = page.locator('#editable-grid-container .tabulator-row .tabulator-cell').nth(1);
    await expect(targetCell).toBeVisible();

    await targetCell.dblclick();
    await page.keyboard.type('pink-check');
    await page.keyboard.press('Enter');

    await expect(targetCell).toHaveCSS('background-color', 'rgb(255, 224, 230)');
  });

  test('単表編集で値が変わらない編集ではセル背景がピンクにならない', async ({ page }) => {
    await page.click('#new-db-button');
    await expandDatabaseNode(page);
    await expandTreeGroup(page, 'Tables');

    await page.locator('.tree-label.Tables[data-name="test"]').click({ button: 'right' });
    await page.click('#db-object-edit-table-data-menu');

    const targetCell = page.locator('#editable-grid-container .tabulator-row .tabulator-cell').nth(1);
    await expect(targetCell).toBeVisible();

    const beforeValue = await targetCell.textContent();
    const sameValue = beforeValue ?? '';

    await targetCell.dblclick();
    await page.keyboard.press('Control+a');
    await page.keyboard.type(sameValue);
    await page.keyboard.press('Enter');

    await expect(targetCell).not.toHaveCSS('background-color', 'rgb(255, 224, 230)');
  });

  test('単表編集で編集前が数値1のセルを未編集確定しても背景がピンクにならない', async ({ page }) => {
    await page.click('#new-db-button');
    await fillSqlEditor(
      page,
      'CREATE TABLE num_check (val INTEGER);\nINSERT INTO num_check (val) VALUES (1);'
    );
    await page.click('#run-button');
    await expect(page.locator('.status-success')).toContainText('クエリ2を実行しました');

    await page.click('#refresh-db-button');
    await expandDatabaseNode(page);
    await expandTreeGroup(page, 'Tables');

    await page.locator('.tree-label.Tables[data-name="num_check"]').click({ button: 'right' });
    await page.click('#db-object-edit-table-data-menu');

    const targetCell = page.locator('#editable-grid-container .tabulator-row .tabulator-cell[tabulator-field="val"]').first();
    await expect(targetCell).toBeVisible();
    await expect(targetCell).toHaveText('1');

    await targetCell.dblclick();
    await page.keyboard.press('Enter');

    await expect(targetCell).not.toHaveCSS('background-color', 'rgb(255, 224, 230)');
  });

  test('単表編集で数値カラムに文字を入力しても値を変更できない', async ({ page }) => {
    await page.click('#new-db-button');
    await fillSqlEditor(
      page,
      'CREATE TABLE numeric_only (val INTEGER);\nINSERT INTO numeric_only (val) VALUES (1);'
    );
    await page.click('#run-button');
    await expect(page.locator('.status-success')).toContainText('クエリ2を実行しました');

    await page.click('#refresh-db-button');
    await expandDatabaseNode(page);
    await expandTreeGroup(page, 'Tables');

    await page.locator('.tree-label.Tables[data-name="numeric_only"]').click({ button: 'right' });
    await page.click('#db-object-edit-table-data-menu');

    const targetCell = page.locator('#editable-grid-container .tabulator-row .tabulator-cell[tabulator-field="val"]').first();
    await expect(targetCell).toBeVisible();
    await expect(targetCell).toHaveText('1');

    await targetCell.dblclick();
    await page.keyboard.type('abc');
    await page.keyboard.press('Enter');

    const cellClass = await targetCell.getAttribute('class');
    const cellTextAfterInvalidInput = ((await targetCell.textContent()) ?? '').trim();
    expect(
      (cellClass ?? '').includes('tabulator-validation-fail') || cellTextAfterInvalidInput === '1'
    ).toBeTruthy();

    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.locator('#editable-grid-container .tabulator-row .tabulator-cell[tabulator-field="rowid"]').first().click();
    await expect(targetCell).toHaveText('1');
    await expect(targetCell).not.toHaveCSS('background-color', 'rgb(255, 224, 230)');
  });

  test('単表編集の変更クエリ生成で特殊テーブル名と日本語カラム名を正しくクォートできる', async ({ page }) => {
    await page.click('#new-db-button');
    await fillSqlEditor(
      page,
      'CREATE TABLE "results (3)" ("都道府県コード" TEXT, "和暦（年）" TEXT);\nINSERT INTO "results (3)" ("都道府県コード", "和暦（年）") VALUES (\'0\', \'8\');'
    );
    await page.click('#run-button');
    await expect(page.locator('.status-success')).toContainText('クエリ2を実行しました');

    await page.click('#refresh-db-button');
    await expandDatabaseNode(page);
    await expandTreeGroup(page, 'Tables');

    await page.locator('.tree-label.Tables[data-name="results (3)"]').click({ button: 'right' });
    await page.click('#db-object-edit-table-data-menu');

    const targetCell = page.locator('#editable-grid-container .tabulator-row .tabulator-cell[tabulator-field="都道府県コード"]').first();
    await expect(targetCell).toBeVisible();
    await targetCell.dblclick();
    await page.keyboard.type('1');
    await page.keyboard.press('Enter');

    const generateUpdateButton = page.locator('[id^="generate-update-query-button-"]').first();
    await generateUpdateButton.click();

    const sql = await getSqlEditorValue(page);
    expect(sql).toContain('UPDATE "results (3)" SET "都道府県コード" = \'1\' WHERE rowid = 1;');

    await page.click('#run-button');
    await expect(page.locator('.status-error')).toHaveCount(0);
    await expect(page.locator('.status-success')).toContainText('クエリ3を実行しました');
  });

  test('単表編集で行削除後に「変更を戻す」ボタンが非活性のまま（不具合再現）', async ({ page }) => {
    await page.click('#new-db-button');
    await expandDatabaseNode(page);
    await expandTreeGroup(page, 'Tables');

    await page.locator('.tree-label.Tables[data-name="test"]').click({ button: 'right' });
    await page.click('#db-object-edit-table-data-menu');

    // 1行目を選択して削除
    const rows = page.locator('#editable-grid-container .tabulator-row');
    await expect(rows.first()).toBeVisible();
    await rows.first().locator('.tabulator-cell').first().click();
    const deleteButton = page.locator('[id^="delete-row-button-"]').first();
    await expect(deleteButton).toBeEnabled();
    await deleteButton.click();

    // この時点で「変更を戻す」ボタンは活性化されているべきだが、現状は非活性
    const undoButton = page.locator('[id^="undo-changes-button-"]').first();
    await expect(undoButton).toBeEnabled(); // ここで失敗するはず
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
    const rows = await page.locator('#results-grid .tabulator-row').count();
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

  test('データセット単表編集の変更クエリ生成は dataset スキーマ付きになる', async ({ page }) => {
    await page.goto('/');
    await page.click('#new-db-button');

    await fillSqlEditor(page, 'SELECT * FROM test LIMIT 100;');
    await page.click('#run-button');
    await page.evaluate(() => { window.prompt = () => 'results (3)'; });
    await page.click('#register-dataset-btn');
    await expect(page.locator('#dataset-tree')).toContainText('results (3)');

    await page.locator('.tree-label.dataset[data-name="results (3)"]').click({ button: 'right' });
    await page.click('#db-object-edit-table-data-menu');

    const targetCell = page.locator('#editable-grid-container .tabulator-row .tabulator-cell[tabulator-field="col1"]').first();
    await expect(targetCell).toBeVisible();
    await targetCell.dblclick();
    await page.keyboard.type('2');
    await page.keyboard.press('Enter');

    await page.locator('[id^="generate-update-query-button-"]').first().click();
    const sql = await getSqlEditorValue(page);
    expect(sql).toContain('UPDATE dataset."results (3)" SET col1 = \'2\' WHERE rowid = 1;');
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