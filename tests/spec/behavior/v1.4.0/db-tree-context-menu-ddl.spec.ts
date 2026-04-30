import { test, expect, Page } from '@playwright/test';

async function expandDatabaseNode(page: Page, alias: string) {
  const dbLabel = page.locator(`.tree-label.db-node[data-db-alias="${alias}"]`);
  const dbChildren = dbLabel.locator('xpath=..').locator('> .db-children');
  if (await dbChildren.isHidden()) {
    await dbLabel.click();
  }
}

async function expandTreeGroup(page: Page, alias: string, title: string) {
  const dbItem = page.locator(`.tree-label.db-node[data-db-alias="${alias}"]`).locator('xpath=..');
  const groupLabel = dbItem.locator(`.${title}-root`).first();
  const groupItems = groupLabel.locator('xpath=following-sibling::*[1]');
  if (await groupItems.isHidden()) {
    await groupLabel.click();
  }
}

test.describe('Databasesツリー右クリックメニュー (v1.4.0)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => typeof window !== 'undefined');
  });

  test('Tables/Views/Indexes/Triggers の右クリックメニューからDDLを表示できる', async ({ page }) => {
    await page.click('#new-db-button');
    await page.fill(
      '#sql-editor',
      "CREATE VIEW v_test AS SELECT col1, col2 FROM test; CREATE INDEX idx_test_col2 ON test(col2); CREATE TRIGGER trg_test_insert AFTER INSERT ON test BEGIN UPDATE test SET col2 = COALESCE(col2, '') WHERE rowid = NEW.rowid; END;"
    );
    await page.click('#run-button');
    await page.click('#refresh-db-button');

    await expandDatabaseNode(page, 'main');

    await expandTreeGroup(page, 'main', 'Tables');
    await page.locator('#db-tree .tree-label.Tables[data-name="test"]').first().click({ button: 'right' });
    await page.click('#db-object-show-ddl-menu');
    await expect(page.locator('#sql-editor')).toHaveValue(/CREATE TABLE\s+test/i);

    await expandTreeGroup(page, 'main', 'Views');
    await page.locator('#db-tree .tree-label.Views[data-name="v_test"]').first().click({ button: 'right' });
    await page.click('#db-object-show-ddl-menu');
    await expect(page.locator('#sql-editor')).toHaveValue(/CREATE VIEW\s+v_test/i);

    await expandTreeGroup(page, 'main', 'Indexes');
    await page.locator('#db-tree .tree-label.Indexes[data-name="idx_test_col2"]').first().click({ button: 'right' });
    await page.click('#db-object-show-ddl-menu');
    await expect(page.locator('#sql-editor')).toHaveValue(/CREATE INDEX\s+idx_test_col2/i);

    await expandTreeGroup(page, 'main', 'Triggers');
    await page.locator('#db-tree .tree-label.Triggers[data-name="trg_test_insert"]').first().click({ button: 'right' });
    await page.click('#db-object-show-ddl-menu');
    await expect(page.locator('#sql-editor')).toHaveValue(/CREATE TRIGGER\s+trg_test_insert/i);
  });
});
