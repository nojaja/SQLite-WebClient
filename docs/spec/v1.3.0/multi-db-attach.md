# 複数DB同時接続・横断クエリ機能仕様

**バージョン**: v1.3.0  
**作成日**: 2026-04-29

---

## 概要

`ATTACH DATABASE` 構文を利用して、単一の SQLite 接続に複数の DB ファイルをアタッチし、
`schema.table` 形式の横断クエリを実行可能にする。

---

## ユースケース / 利用シナリオ

1. ユーザーが「開く」ボタンで複数の `.db` ファイルを同時に選択する。
2. 1 つ目のファイルがメイン DB として読み込まれ、2 つ目以降がエイリアス付きでアタッチされる。
3. サイドバーのツリーに各 DB のテーブルが表示される。
4. クエリエディタで `SELECT * FROM sub.orders JOIN main.users ON ...` のような横断クエリを実行できる。
5. 不要になった追加 DB はサイドバーの「Detach」ボタンで切り離せる。

---

## 機能要件

### FR-1: 複数ファイル選択
- 「開く」ボタンのファイル入力に `multiple` 属性を付与する。
- 複数ファイルが選択された場合、先頭ファイルをメイン DB (`import`) に、残りを `ATTACH` する。

### FR-2: `attachDatabase(alias, data)`
- `alias` はファイル名から自動生成する（拡張子除去・記号を `_` に置換）。
- `alias` は `[a-zA-Z_][a-zA-Z0-9_]*` のみ許可（SQL インジェクション対策）。
- 内部でユニークなファイル名を生成し、VFS へバイナリを書き込んでから `ATTACH DATABASE` を実行する。
- 既に同じ alias がアタッチ済みの場合はエラーを返す。

### FR-3: `detachDatabase(alias)`
- `DETACH DATABASE` を実行して接続を解除する。
- UI はサイドバーの「Detach」ボタン（`data-detach-alias` 属性）で起動する。

### FR-4: `listAttachedDatabases()`
- `PRAGMA database_list` の結果を `{seq, name, file}` の配列で返す。

### FR-5: `getDatabaseSchema(schemaName)`
- 引数省略時は `'main'` を使用（後方互換性維持）。
- `schemaName.sqlite_master` を参照して指定スキーマのオブジェクト一覧を返す。
- 戻り値に `alias` フィールドを追加する。

### FR-6: `getAllDatabaseSchemas()`
- `listAttachedDatabases()` から `temp` を除外した全 DB のスキーマ配列を返す。

### FR-7: サイドバーツリー (複数 DB 対応)
- `updateDatabaseTree(schemas)` はスキーマ配列を受け取る。
- 各 DB を折り畳み可能なノードとして表示。ノードのラベルはエイリアス名。
- `main` 以外のノードには「Detach」ボタン (`data-detach-alias`) を表示。
- テーブルクリック時のエディタ挿入文：
  - `main`: `SELECT * FROM tableName LIMIT 100`
  - attached: `SELECT * FROM alias.tableName LIMIT 100`

---

## 非機能要件

- **セキュリティ**: alias は正規表現 `^[a-zA-Z_][a-zA-Z0-9_]*$` で検証し、SQL 文字列埋め込みを防ぐ。
- **互換性**: `getDatabaseSchema()` の引数なし呼び出しは従来と同じ動作を維持する。
- **パフォーマンス**: 追加 DB の VFS ファイル生成は開くタイミングのみ実行する。
- **エラーハンドリング**: ATTACH/DETACH 失敗時は `ui.showError` でメッセージ表示。

---

## API / インターフェース定義

```js
// SQLiteManager
attachDatabase(alias: string, data: Uint8Array): string  // alias を返す
detachDatabase(alias: string): void
listAttachedDatabases(): Array<{seq: number, name: string, file: string}>
getDatabaseSchema(schemaName?: string): {alias, tables, views, indexes, triggers}
getAllDatabaseSchemas(): Array<{alias, tables, views, indexes, triggers}>

// Sidebar
updateDatabaseTree(schemas: Array<{alias, tables, views, indexes, triggers}>): void
```

---

## 受け入れ条件 (Acceptance Criteria)

| # | 条件 | 検証方法 |
|---|------|---------|
| AC-1 | 複数の `.db` ファイルを同時に開いたとき、全ての DB がサイドバーに表示される | E2E / 目視 |
| AC-2 | `schema.table` 形式の横断クエリが結果を返す | E2E / 目視 |
| AC-3 | ATTACH 先のテーブルがサイドバーのツリーに表示される | E2E / 目視 |
| AC-4 | 「Detach」ボタンクリックで対象 DB がツリーから消える | E2E / 目視 |
| AC-5 | 無効な alias でアタッチしようとするとエラーになる | 単体テスト相当 |
| AC-6 | メイン DB のテーブルクリックで `SELECT * FROM table` がエディタに入る | E2E |
| AC-7 | アタッチ DB のテーブルクリックで `SELECT * FROM alias.table` がエディタに入る | E2E |

---

## テストケース概要

- `v1.3.0/multi-db-attach.spec.ts` に Playwright E2E テストを記述。
- テスト用の SQLite DB バイナリをフィクスチャとして `tests/fixtures/` に配置。

---

## ロールアウト計画

- 既存の単一 DB 動作は `main` スキーマとして継続動作。
- `updateDatabaseTree` は単一スキーマオブジェクトではなく配列を受け取るよう変更（破壊的変更）。
  - 全呼び出し箇所を本 PR で同時修正する。
