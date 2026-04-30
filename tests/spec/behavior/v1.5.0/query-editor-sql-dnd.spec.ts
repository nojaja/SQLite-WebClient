/**
 * クエリエディタへの SQL ファイル D&D 機能 E2E テスト (v1.5.0)
 *
 * 受け入れ条件:
 *   AC-1: .sql ファイルを #query-editor にドロップすると Open Query と同じ結果になる
 *   AC-2: ドラッグ中に drop 可能であることを示す表示が出る
 *   AC-3: 非対応ファイル（.txt など）をドラッグすると不可表示が出る
 */
import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs/promises';
import { getSqlEditorValue } from '../../../helpers/monacoEditor';

const SQL_FIXTURE = path.resolve(__dirname, '../../../fixtures/sample.sql');

/**
 * クエリエディタへ SQL ファイルをD&Dするヘルパー
 */
async function dropSqlFile(page: Page) {
  const bytes = Array.from(await fs.readFile(SQL_FIXTURE));
  await page.evaluate((payload) => {
    const editor = document.getElementById('query-editor');
    if (!editor) throw new Error('#query-editor が見つかりません');

    const dataTransfer = new DataTransfer();
    const file = new File([new Uint8Array(payload.bytes)], payload.name, { type: 'application/sql' });
    dataTransfer.items.add(file);

    editor.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer }));
    editor.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }));
    editor.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
  }, { name: 'sample.sql', bytes });
}

/**
 * クエリエディタへ非対応ファイルをドラッグ（dragenter+dragover のみ）するヘルパー
 */
async function dragOverQueryEditor(page: Page, fileName: string) {
  await page.evaluate((name) => {
    const editor = document.getElementById('query-editor');
    if (!editor) throw new Error('#query-editor が見つかりません');
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File(['dummy'], name, { type: 'text/plain' }));
    editor.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer }));
    editor.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }));
  }, fileName);
}

test.describe('クエリエディタ SQL D&D (v1.5.0)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('#new-db-button');
  });

  test('AC-1: .sql ファイルをドロップするとエディタに SQL が読み込まれる', async ({ page }) => {
    await dropSqlFile(page);

    const editorValue = await getSqlEditorValue(page);
    expect(editorValue).toContain("SELECT 'drag-and-drop-sql'");
  });

  test('AC-2: .sql ドラッグ中にドロップ可能インジケータが表示される', async ({ page }) => {
    await dragOverQueryEditor(page, 'query.sql');

    await expect(page.locator('#query-editor .query-drop-indicator')).toBeVisible();
    await expect(page.locator('#query-editor .query-drop-indicator')).not.toHaveClass(/invalid/);
  });

  test('AC-3: 非対応ファイルをドラッグすると不可インジケータが表示される', async ({ page }) => {
    await dragOverQueryEditor(page, 'data.txt');

    await expect(page.locator('#query-editor .query-drop-indicator')).toBeVisible();
    await expect(page.locator('#query-editor .query-drop-indicator')).toHaveClass(/invalid/);
  });
});
