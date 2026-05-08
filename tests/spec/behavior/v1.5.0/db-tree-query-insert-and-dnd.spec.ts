import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs/promises';
import { fillSqlEditor, getSqlEditorValue } from '../../../helpers/monacoEditor';

const TREE_ITEM_TRANSFER_TYPE = 'application/x-sqlite-webclient-tree-item-name';
const csvFixture = path.resolve(__dirname, '../../../fixtures/dataset-upload.csv');

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

async function ensureTableColumnsVisible(page: Page, alias: string, tableName: string) {
  const tableLabel = page.locator(`.tree-label.Tables[data-db-alias="${alias}"][data-name="${tableName}"]`).first();
  const firstColumn = page.locator(`.tree-label.Columns[data-db-alias="${alias}"][data-table-name="${tableName}"]`).first();
  // count() ではなく isVisible() で確認する。
  // v-for はカラム要素を常に DOM に出力し display:none で隠すため count() は常に > 0 になる
  if (!await firstColumn.isVisible()) {
    await tableLabel.click();
  }
}

/**
 * 処理名: ツリーアイテム名称をエディタへ D&D するヘルパー
 * 処理概要: DragEvent を #query-editor に直接 dispatch し、tree-item D&D を再現する
 * 実装理由: Playwright の dragTo は CDP 経由で実ブラウザ操作をシミュレートするが、
 *           Monaco Editor 内部要素が dragover を受け取ってフリーズするため、
 *           page.evaluate で dispatchEvent を使い #query-editor に直接送る方式を採用する
 * @param page Playwright の Page オブジェクト
 * @param itemName 挿入する項目名
 */
async function dispatchTreeItemDropToEditor(page: Page, itemName: string): Promise<void> {
  await page.evaluate(({ name, type }) => {
    const editor = document.getElementById('query-editor');
    if (!editor) throw new Error('#query-editor が見つかりません');
    const dt = new DataTransfer();
    dt.setData(type, name);
    const opts = { bubbles: true, cancelable: true, dataTransfer: dt, clientX: 400, clientY: 300 };
    editor.dispatchEvent(new DragEvent('dragenter', opts));
    editor.dispatchEvent(new DragEvent('dragover',  opts));
    editor.dispatchEvent(new DragEvent('drop',      opts));
  }, { name: itemName, type: TREE_ITEM_TRANSFER_TYPE });
}

async function dropDatasetCsv(page: Page) {
  const bytes = Array.from(await fs.readFile(csvFixture));
  await page.evaluate((payload) => {
    const datasetTree = document.getElementById('dataset-tree');
    if (!datasetTree) throw new Error('#dataset-tree が見つかりません');

    const dataTransfer = new DataTransfer();
    const file = new File([new Uint8Array(payload.bytes)], payload.name, { type: 'text/csv' });
    dataTransfer.items.add(file);

    datasetTree.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer }));
    datasetTree.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }));
    datasetTree.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
  }, {
    name: 'dataset-upload.csv',
    bytes,
  });
}

test.describe('DBツリー SQL挿入とtree-item D&D (v1.5.0)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('#new-db-button');
    await expandDatabaseNode(page, 'main');
    await expandTreeGroup(page, 'main', 'Tables');
  });

  /**
   * 再現テスト: tree-item D&D で名称が挿入され Monaco がフリーズしないこと
   *
   * 失敗条件（修正前）:
   *   - @dragover が bubble フェーズのため Monaco 内部要素が先に dragover を受け取り
   *     dnd-drag-over 状態に入る
   *   - @drop.capture で drop を遮断するため Monaco が状態をリセットできずフリーズ
   * 合格条件（修正後）:
   *   - @dragover.capture.prevent により #query-editor が capture フェーズで先に
   *     dragover を受け取り stopPropagation で Monaco 内部要素への伝播を遮断
   *   - dragAndDrop: false で Monaco の D&D ハンドラを未登録にする二重防護
   */
  test('Monaco内部要素へのD&Dで名称が挿入されフリーズしない', async ({ page }) => {
    test.setTimeout(60000);

    await fillSqlEditor(page, 'SELECT ');
    await dispatchTreeItemDropToEditor(page, 'test');

    // 名称が挿入されていること
    const sql = await getSqlEditorValue(page);
    expect(sql).toContain('test');

    // Monaco がドラッグ追跡状態（dnd-drag-over クラス）でフリーズしていないこと
    await expect(page.locator('#sql-editor .monaco-editor.dnd-drag-over')).not.toBeAttached({ timeout: 3000 });
  });

  test('テーブル配下にカラム一覧が表示される', async ({ page }) => {
    await ensureTableColumnsVisible(page, 'main', 'test');
    await expect(page.locator('.tree-label.Columns[data-table-name="test"][data-column-name="col1"]')).toBeVisible();
    await expect(page.locator('.tree-label.Columns[data-table-name="test"][data-column-name="col2"]')).toBeVisible();
  });

  test('テーブル/カラムのコンテキストメニューで各SQLを追記できる', async ({ page }) => {
    await fillSqlEditor(page, 'SELECT 0;');

    await page.locator('.tree-label.Tables[data-name="test"]').first().click({ button: 'right' });
    await page.click('#db-object-insert-select-menu');
    await page.locator('.tree-label.Tables[data-name="test"]').first().click({ button: 'right' });
    await page.click('#db-object-insert-update-menu');
    await page.locator('.tree-label.Tables[data-name="test"]').first().click({ button: 'right' });
    await page.click('#db-object-insert-insert-menu');
    await page.locator('.tree-label.Tables[data-name="test"]').first().click({ button: 'right' });
    await page.click('#db-object-insert-delete-menu');

    await ensureTableColumnsVisible(page, 'main', 'test');
    await page.locator('.tree-label.Columns[data-table-name="test"][data-column-name="col1"]').first().click({ button: 'right' });
    await page.click('#db-object-insert-select-menu');

    const sql = await getSqlEditorValue(page);
    expect(sql).toContain('SELECT col1, col2 FROM test LIMIT 100;');
    expect(sql).toContain('UPDATE test SET col1 = ?, col2 = ? WHERE ;');
    expect(sql).toContain('INSERT INTO test (col1, col2) VALUES (?, ?);');
    expect(sql).toContain('DELETE FROM test WHERE ;');
    expect(sql).toContain('SELECT col1 FROM test LIMIT 100;');
  });

  test('dataset-treeのコンテキストメニューで各SQLを追記できる', async ({ page }) => {
    await dropDatasetCsv(page);
    await expect(page.locator('#dataset-tree')).toContainText('dataset-upload');

    await fillSqlEditor(page, 'SELECT 0;');

    const datasetItem = page.locator('#dataset-tree .tree-label.dataset[data-name="dataset-upload"]').first();
    await datasetItem.click({ button: 'right' });
    await expect(page.locator('#db-object-show-ddl-menu')).toHaveCount(0);
    await page.click('#db-object-insert-select-menu');

    await datasetItem.click({ button: 'right' });
    await page.click('#db-object-insert-update-menu');

    await datasetItem.click({ button: 'right' });
    await page.click('#db-object-insert-insert-menu');

    await datasetItem.click({ button: 'right' });
    await page.click('#db-object-insert-delete-menu');

    const sql = await getSqlEditorValue(page);
    expect(sql).toContain('SELECT 0;');
    expect(sql).toMatch(/SELECT\s+\*\s+FROM\s+.+dataset-upload.+LIMIT 100;/i);
    expect(sql).toMatch(/UPDATE\s+.+dataset-upload.+SET\s+column\s*=\s*\?\s+WHERE\s*;/i);
    expect(sql).toMatch(/INSERT\s+INTO\s+.+dataset-upload.+\(column\)\s+VALUES\s*\(\?\);/i);
    expect(sql).toMatch(/DELETE\s+FROM\s+.+dataset-upload.+WHERE\s*;/i);
  });

  test('tree-itemをクエリエディタへD&Dすると名称が挿入される', async ({ page }) => {
    test.setTimeout(60000);

    await fillSqlEditor(page, 'SELECT ');
    await dispatchTreeItemDropToEditor(page, 'test');

    const sql = await getSqlEditorValue(page);
    expect(sql).toContain('test');
  });
});
