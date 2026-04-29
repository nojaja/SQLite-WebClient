# Dataset DB

## 概要
データセットを一時オブジェクトではなく hidden な attached SQLite DB `dataset` として扱う。結果セット登録と CSV 取込の両方を `dataset` スキーマ配下のテーブルとして管理し、左ペインのデータセット一覧は `dataset` DB の Tables を表示する。

## ユースケース
- SELECT 結果をデータセットとして再利用する。
- CSV をデータセットとして取り込み、SQL から参照する。
- ページ再読込後もデータセットが復元される。
- データセット一覧クリックでクエリエディタに取得 SQL を挿入する。

## 機能要件
- `dataset` DB は attached DB として存在する。
- `dataset` DB は Database ツリーには表示しない。
- Dataset ツリーは `dataset` DB の Tables 一覧を表示する。
- 「データセットに登録」はアクティブな結果セットから新規テーブルを作成し、行を INSERT する。
- Dataset ツリークリックは result-tab を追加せず、通常テーブルクリックと同じ SQL 生成処理を使う。
- データセット追加ボタンは CSV を取り込み、ファイル名ベースのテーブル名で `dataset` DB に保存する。
- CSV 取込時の型推論は 1 行目の値を見て `DATE` > `INTEGER/REAL` > `TEXT` の優先順位で判定する。
- CSV 取込時に同名テーブルが存在する場合は別名を採番する。
- `dataset` DB の内容はページ再読込後に復元される。

## 非機能要件
- 既存の通常 DB 操作と干渉しない。
- データセット一覧クリック時の SQL 生成は通常テーブルと処理を共通化する。

## 受け入れ条件
- SELECT 結果を登録すると Dataset ツリーにテーブル名が表示され、Database ツリーには `dataset` が表示されない。
- Dataset ツリーの項目をクリックするとクエリエディタに `SELECT * FROM dataset.<table> LIMIT 100` 相当の SQL が入る。
- ページ再読込後も登録済みデータセットが Dataset ツリーに残る。
- CSV 取込後、Dataset ツリーにテーブルが追加される。
- CSV 同名再取込時、既存テーブルを壊さず別名テーブルが作成される。

## テスト概要
- 結果セット登録で hidden dataset DB と Dataset ツリーが更新されること。
- Dataset ツリークリックで SQL が挿入されること。
- ページ再読込後にデータセットが復元されること。
- CSV 取込でテーブル作成、型推論、別名採番が機能すること。
