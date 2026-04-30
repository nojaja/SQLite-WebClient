import { test, expect } from '@playwright/test';
import path from 'path';
import { fillSqlEditor, getSqlEditorValue } from '../../../helpers/monacoEditor';

const csvFixture = path.resolve(__dirname, '../../../fixtures/dataset-upload.csv');

test.describe('dataset DB', () => {
  test('SELECT結果をdataset DBに登録し再読込後も復元する', async ({ page }) => {
    await page.goto('/');

    await page.click('#new-db-button');
    await fillSqlEditor(page, 'SELECT * FROM test LIMIT 100;');
    await page.click('#run-button');

    await page.evaluate(() => {
      window.prompt = () => 'test_dataset';
    });
    await page.click('#register-dataset-btn');

    await expect(page.locator('#dataset-tree')).toContainText('test_dataset');
    await expect(page.locator('#db-tree')).not.toContainText(/^dataset$/);

    await page.locator('#dataset-tree .tree-label.dataset', { hasText: 'test_dataset' }).click();
    expect(await getSqlEditorValue(page)).toMatch(/SELECT \* FROM dataset\.?"?test_dataset"? LIMIT 100/i);
    await expect(page.locator('.result-tab', { hasText: 'test_dataset' })).toHaveCount(0);

    await page.reload();
    await expect(page.locator('#dataset-tree')).toContainText('test_dataset');
  });

  test('CSV取込でdataset DBに別名テーブルを追加する', async ({ page }) => {
    await page.goto('/');

    await page.click('#add-dataset-button');
    const firstInput = page.locator('input[type="file"]').last();
    await firstInput.setInputFiles(csvFixture);

    await expect(page.locator('#dataset-tree')).toContainText('dataset-upload');

    await page.click('#add-dataset-button');
    const secondInput = page.locator('input[type="file"]').last();
    await secondInput.setInputFiles(csvFixture);

    const datasetItems = page.locator('#dataset-tree .tree-label.dataset');
    await expect(datasetItems).toHaveCount(2);
    await expect(page.locator('#dataset-tree')).toContainText('dataset-upload');
  });

  test('データセット削除ボタンで対象テーブルを削除できる', async ({ page }) => {
    await page.goto('/');

    await page.click('#new-db-button');
    await fillSqlEditor(page, 'SELECT * FROM test LIMIT 100;');
    await page.click('#run-button');

    await page.evaluate(() => {
      window.prompt = () => 'delete_target';
    });
    await page.click('#register-dataset-btn');

    const deleteButton = page.locator('[data-delete-dataset-table="delete_target"]');
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    await expect(page.locator('#dataset-tree')).not.toContainText('delete_target');

    await page.reload();
    await expect(page.locator('#dataset-tree')).not.toContainText('delete_target');
  });
});
