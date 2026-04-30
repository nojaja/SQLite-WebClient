# Databasesツリー項目のコンテキストメニューとDDL表示

## 概要
Databases ツリーの Tables / Views / Indexes / Triggers 各項目で右クリックメニューを表示し、メニューから対象オブジェクトの DDL 文をクエリエディタへ表示できるようにする。

## ユースケース
- ユーザーがテーブル定義を確認したいとき、対象項目を右クリックして DDL を即時表示する。
- ビュー、インデックス、トリガーの定義を確認して保守や調査を行う。

## 機能要件
- Databases ツリー内の Tables / Views / Indexes / Triggers の各アイテムでコンテキストメニューを表示する。
- コンテキストメニューに `DDLを表示` メニューを表示する。
- `DDLを表示` 実行時、`sqlite_master.sql` を参照して DDL を取得する。
- 取得した DDL をクエリエディタのアクティブタブへ設定する。
- DDL が存在しない場合はエラーメッセージを表示する。

## 非機能要件
- DB スキーマ名は既存のエイリアスバリデーションで検証する。
- SQL 文字列リテラルと識別子はエスケープ処理して SQL インジェクションを防ぐ。

## インターフェース
- Sidebar -> App: `show-ddl` イベント
  - payload: `{ alias: string; name: string; objectType: 'table' | 'view' | 'index' | 'trigger' }`
- SQLiteManager:
  - `getSchemaObjectDdl(schemaName, objectType, objectName): string`

## 受け入れ条件
- AC-1: Tables の項目右クリックで `DDLを表示` メニューが表示される。
- AC-2: Views の項目右クリックで `DDLを表示` メニューが表示される。
- AC-3: Indexes の項目右クリックで `DDLを表示` メニューが表示される。
- AC-4: Triggers の項目右クリックで `DDLを表示` メニューが表示される。
- AC-5: 各メニュー実行時に対象オブジェクトの CREATE 文がクエリエディタに表示される。

## テストケース要約
- Playwright で main DB に view/index/trigger を作成。
- 各グループ項目を右クリックして `DDLを表示` を実行。
- エディタ値に `CREATE TABLE/VIEW/INDEX/TRIGGER` が含まれることを確認。
