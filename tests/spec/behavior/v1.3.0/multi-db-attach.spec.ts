/**
 * 複数DB同時接続・横断クエリ機能 E2E テスト (v1.3.0)
 *
 * 受け入れ条件:
 *   AC-1: 複数 DB ファイルを同時に開くとサイドバーに全 DB が表示される
 *   AC-2: schema.table 形式の横断クエリが結果を返す
 *   AC-3: ATTACH 先のテーブルがサイドバーのツリーに表示される
 *   AC-4: Detach ボタンクリックで対象 DB がツリーから消える
 *   AC-6: main DB のテーブルクリックで SELECT * FROM table がエディタに入る
 *   AC-7: アタッチ DB のテーブルクリックで SELECT * FROM alias.table がエディタに入る
 */
import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs/promises';
import { fillSqlEditor, getSqlEditorValue } from '../../../helpers/monacoEditor';

const SUB_DB_PATH = path.resolve(__dirname, '../../../fixtures/sub.db');
const MAIN_DB_PATH = path.resolve(__dirname, '../../../fixtures/main.db');

/**
 * 「開く」ボタンで複数ファイルを選択するヘルパー
 * Playwright の setInputFiles で <input type="file"> に直接セットする。
 */
async function openDbFiles(page: Page, filePaths: string[]) {
  // open-db-button クリックでは input が動的生成されるため、
  // クリック前にファイル選択イベントを待ち受ける
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('#open-db-button'),
  ]);
  await fileChooser.setFiles(filePaths);
}

/**
 * DBツリーへファイルD&Dを模擬するヘルパー
 */
async function dropDbFiles(page: Page, files: Array<{ filePath: string; fileName?: string }>) {
  const payload = await Promise.all(files.map(async item => ({
    name: item.fileName ?? path.basename(item.filePath),
    bytes: Array.from(await fs.readFile(item.filePath))
  })));

  await page.evaluate((dropped) => {
    const dbTree = document.getElementById('db-tree');
    if (!dbTree) throw new Error('#db-tree が見つかりません');

    const dataTransfer = new DataTransfer();
    for (const fileItem of dropped) {
      const file = new File([new Uint8Array(fileItem.bytes)], fileItem.name, { type: 'application/octet-stream' });
      dataTransfer.items.add(file);
    }

    dbTree.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer }));
    dbTree.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }));
    dbTree.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
  }, payload);
}

/**
 * DBツリーのドラッグ中表示を模擬するヘルパー
 */
async function dragOverDbTree(page: Page, fileName: string) {
  await page.evaluate((name) => {
    const dbTree = document.getElementById('db-tree');
    if (!dbTree) throw new Error('#db-tree が見つかりません');
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File(['dummy'], name, { type: 'application/octet-stream' }));
    dbTree.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer }));
    dbTree.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }));
  }, fileName);
}

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

test.describe('複数DB接続・横断クエリ (v1.3.0)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // アプリ初期化を待つ
    await page.waitForFunction(() => typeof window !== 'undefined');
  });

  // AC-3: サブ DB を 1 ファイルアタッチ → ツリーに表示
  test('AC-3: アタッチ DB のテーブルがサイドバーに表示される', async ({ page }) => {
    await openDbFiles(page, [SUB_DB_PATH]);

    const mainDbLabel = page.locator('.tree-label.db-node[data-db-alias="main"]');
    const mainDbChildren = mainDbLabel.locator('xpath=..').locator('> .db-children');
    await expect(mainDbLabel).toBeVisible({ timeout: 5000 });
    await expect(mainDbChildren).toBeHidden();

    await mainDbLabel.click();
    await expandTreeGroup(page, 'main', 'Tables');
    await expect(page.locator('#db-tree .tree-label.Tables[data-name="orders"]')).toBeVisible({ timeout: 5000 });
  });

  // AC-2: 横断クエリ (sub.orders を直接 SELECT)
  test('AC-2: アタッチ DB へのクエリが結果を返す', async ({ page }) => {
    await openDbFiles(page, [MAIN_DB_PATH, SUB_DB_PATH]);

    // クエリを入力して実行
    await fillSqlEditor(page, 'SELECT * FROM sub.orders;');
    await page.click('#run-button');

    // Results タブが表示されることを確認
    await expect(page.locator('.result-tab').filter({ hasText: 'Results' }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#results-grid')).toContainText('Apple');
  });

  // AC-1: 既存 DB の開閉状態を維持したまま追加 DB が表示される
  test('AC-1: DB追加時に既存ノードの開閉状態を維持する', async ({ page }) => {
    await openDbFiles(page, [MAIN_DB_PATH]);

    const mainDbLabel = page.locator('.tree-label.db-node[data-db-alias="main"]');
    const mainDbChildren = mainDbLabel.locator('xpath=..').locator('> .db-children');

    await expect(mainDbLabel).toBeVisible({ timeout: 5000 });
    await expect(mainDbChildren).toBeHidden();

    await mainDbLabel.click();
    await expect(mainDbChildren).toBeVisible();

    await openDbFiles(page, [SUB_DB_PATH]);

    const subDbLabel = page.locator('.tree-label.db-node[data-db-alias="sub"]');
    const subDbChildren = subDbLabel.locator('xpath=..').locator('> .db-children');

    await expect(subDbLabel).toBeVisible({ timeout: 5000 });
    await expect(mainDbChildren).toBeVisible();
    await expect(subDbChildren).toBeHidden();
  });

  test('AC-8: DBツリーD&DはOpenと同一動作で .sqlite を受け入れる', async ({ page }) => {
    await openDbFiles(page, [MAIN_DB_PATH]);

    await dragOverDbTree(page, 'sub.sqlite');
    await expect(page.locator('#db-tree')).toHaveClass(/drop-target-active/);
    await expect(page.locator('#db-tree .db-drop-indicator')).toContainText('DBファイルをドロップして開く / アタッチ');

    await dropDbFiles(page, [{ filePath: SUB_DB_PATH, fileName: 'sub.sqlite' }]);
    await expect(page.locator('.tree-label.db-node[data-db-alias="sub"]')).toBeVisible({ timeout: 5000 });
  });

  test('Databasesツリーはsidebar高さの50%以内に収まりデータセット領域を残す', async ({ page }) => {
    await openDbFiles(page, [MAIN_DB_PATH]);

    for (let index = 0; index < 16; index += 1) {
      await openDbFiles(page, [SUB_DB_PATH]);
    }

    const layout = await page.evaluate(() => {
      const sidebar = document.querySelector('.sidebar');
      const databasesBlock = document.querySelector('.databases-tree-block');
      const datasetBlock = document.querySelector('.dataset-tree-block');
      const databasesTree = document.getElementById('db-tree');
      if (!sidebar || !databasesBlock || !datasetBlock || !databasesTree) return null;

      return {
        nodeCount: document.querySelectorAll('.tree-label.db-node').length,
        sidebarHeight: sidebar.getBoundingClientRect().height,
        databasesHeight: databasesBlock.getBoundingClientRect().height,
        datasetHeight: datasetBlock.getBoundingClientRect().height,
        databasesTreeClientHeight: databasesTree.clientHeight,
        databasesTreeScrollHeight: databasesTree.scrollHeight
      };
    });

    expect(layout).not.toBeNull();
    expect(layout!.nodeCount).toBeGreaterThanOrEqual(10);
    expect(layout!.databasesHeight).toBeLessThanOrEqual(layout!.sidebarHeight * 0.5 + 1);
    expect(layout!.datasetHeight).toBeGreaterThan(0);
    expect(layout!.databasesTreeScrollHeight).toBeGreaterThan(layout!.databasesTreeClientHeight);
  });

  // AC-4: Detach ボタンでアタッチ DB が削除される
  test('AC-4: Detach ボタンでアタッチ DB がツリーから消える', async ({ page }) => {
    // sub DB をアタッチ (2 ファイル選択: main + sub)
    // フィクスチャが 1 つのため、アタッチのみシナリオとして実装
    // まず main を開き、その後アタッチ操作は手動 SQL で行う
    await fillSqlEditor(page, `ATTACH DATABASE ':memory:' AS subtest`);
    await page.click('#run-button');
    // ツリーを Refresh して subtest ノードを確認
    await page.click('#refresh-db-button');
    await expect(page.locator('[data-detach-alias="subtest"]')).toBeVisible({ timeout: 5000 });

    // Detach ボタンをクリック
    await page.click('[data-detach-alias="subtest"]');

    // subtest ノードが消えることを確認
    await expect(page.locator('[data-detach-alias="subtest"]')).not.toBeVisible({ timeout: 5000 });
  });

  // AC-6: main DB のテーブルクリックで SELECT * FROM table がエディタに入る
  test('AC-6: main テーブルクリックで SELECT 文がエディタに入る', async ({ page }) => {
    await openDbFiles(page, [MAIN_DB_PATH]);
    await expandDatabaseNode(page, 'main');
    await expandTreeGroup(page, 'main', 'Tables');

    const usersTableLabel = page.locator('#db-tree .tree-label.Tables[data-name="users"]').first();
    await usersTableLabel.click();

    const editorValue = await getSqlEditorValue(page);
    expect(editorValue).toContain('SELECT * FROM users LIMIT 100');
    expect(editorValue).not.toContain('main.');
  });

  // AC-7: アタッチ DB のテーブルクリックで SELECT * FROM alias.table がエディタに入る
  test('AC-7: アタッチ DB テーブルクリックで alias.table 形式がエディタに入る', async ({ page }) => {
    await openDbFiles(page, [MAIN_DB_PATH, SUB_DB_PATH]);
    await expandDatabaseNode(page, 'sub');
    await expandTreeGroup(page, 'sub', 'Tables');

    const ordersLabel = page.locator('#db-tree .tree-label.Tables[data-name="orders"][data-db-alias="sub"]').first();
    await ordersLabel.click();

    const editorValue = await getSqlEditorValue(page);
    expect(editorValue).toContain('SELECT * FROM sub.orders LIMIT 100');
  });
});
