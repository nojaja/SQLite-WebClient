# DataTables から Tabulator への移行仕様

## 概要
v1.6.0 では、結果グリッド実装を DataTables から Tabulator へ置き換える。
目的は以下のとおり。
- 将来的なセル編集機能追加に備え、編集 API を標準搭載するグリッドへ移行する。
- 現行 UI/UX と既存機能の互換を維持したまま実装を単純化する。
- E2E テストをグリッド実装依存から段階的に切り離し、回帰耐性を上げる。

本仕様は、まず現行 DataTables 利用機能の棚卸しを行い、Tabulator での対応仕様と移行計画を定義する。

## 対象範囲
- 対象コンポーネント: src/js/components/MainArea.vue
- 対象スタイル: src/css/app.scss
- 対象依存関係: package.json の DataTables 系依存を Tabulator 系依存に置換
- 対象テスト: tests/ui.spec.ts, tests/example.spec.ts, tests/spec/behavior/v1.3.0/multi-db-attach.spec.ts

## 非対象
- v1.6.0 ではセル編集 UI は有効化しない（編集機能は将来拡張用の土台のみ）。
- クエリ実行ロジック、DB ツリー、Dataset 機能の仕様は変更しない。

## 現状 DataTables 利用機能と Tabulator 対応仕様

### 機能対応表
| 現状機能 (DataTables) | 現状設定/利用方法 | Tabulator 対応仕様 | 備考 |
| --- | --- | --- | --- |
| 行データ表示 | data, columns を直接バインド | data と columns を Tabulator 定義へ変換して描画 | 既存の列順を維持 |
| 列ヘッダ表示 | columns: { data, title } 生成 | columns: { title, field } 生成 | title/field を同一値にする |
| ページング | paging: true | pagination: true, paginationMode: local, paginationSize: 10 | 既定ページサイズは 10 |
| 検索 UI 非表示 | searching: false | headerFilter は未使用、グローバル検索 UI も未実装 | 現行同等で非表示 |
| 情報表示非表示 | info: false | footerElement なし、ページ情報表示なし | 現行同等で非表示 |
| 固定ヘッダ無効 | fixedHeader: false | movableRows/height を使わず通常スクロールで運用 | 現行同等で固定しない |
| 上部レイアウト非表示 | layout.topStart/topEnd を null | ツールバー DOM を持たない構成にする | 現行同等 |
| 再描画制御 | renderKey を増分して再生成 | setData または key 再生成で再描画 | 初期は key 再生成で安全側 |
| 欠損値の正規化 | undefined を null 化 | 同様の正規化を維持 | 既存不具合回避を継続 |
| 結果タブ単位の表示 | resultTabs + resultGridData Map | 同一のタブ管理を維持し、各タブに Tabulator を 1 インスタンス | タブ管理仕様は不変 |

### DOM/セレクタ互換方針
- 既存のテスト資産を保護するため、結果領域コンテナ id は継続して results-grid を使う。
- 一方で行セレクタは tbody tr から Tabulator の row 要素へ変わるため、以下のいずれかで統一する。
  - 推奨: テスト専用属性 data-testid を導入し、実装依存の class/tag セレクタを減らす。
  - 暫定: .tabulator-row を使用する。

## Tabulator 実装仕様

### 依存関係
- 追加: tabulator-tables
- 削除: datatables.net-vue3, datatables.net-dt, datatables.net-fixedheader-dt

### 描画仕様
- MainArea の結果タブ内で Tabulator インスタンスを生成する。
- 入力データは既存 setResultGridData の正規化済みデータを再利用する。
- columns は result.columns から動的生成する。
- レイアウトはレガシー互換を優先し、以下を基本設定とする。
  - layout: fitDataStretch
  - pagination: true
  - paginationMode: local
  - paginationSize: 10
  - selectableRows: false
  - index: 内部採番のみ（業務キー未指定）

### 編集機能の扱い
- v1.6.0 では編集機能を無効のまま導入する。
- 将来拡張しやすいよう、列定義に editor 設定を注入できる設計点を用意する（実際の editor 有効化は別チケット）。

### スタイル仕様
- DataTables 専用セレクタ群は削除し、Tabulator セレクタへ置換する。
- ヘッダ背景色、セル境界線、フォントサイズは現行見た目に近似させる。
- 結果グリッド領域の縦横スクロール特性は現行維持とする。

## 移行手順

### フェーズ 0: ブランチ準備
1. package.json の version を 1.6.0 に更新する。
2. 移行作業ブランチを作成し、v1.5.3 から着手する。

### フェーズ 1: テスト先行（失敗確認）
1. DataTables 前提の行セレクタを Tabulator 前提へ変更する。
   - 例: #results-grid tbody tr -> #results-grid .tabulator-row
2. 変更後に E2E を実行し、該当テストが失敗することを確認する。
3. 失敗ログを保存し、移行前失敗の証跡とする。

### フェーズ 2: 実装移行
1. MainArea から DataTables import/use を削除する。
2. Tabulator を導入し、結果タブごとの描画処理を置換する。
3. 既存の resultGridData 正規化ロジックを維持する。
4. app.scss の DataTables 用スタイルを Tabulator 用へ置換する。
5. App.vue のライセンス表示を DataTables から Tabulator へ更新する。
6. package.json の依存関係を更新する。

### フェーズ 3: テスト修正と成功確認
1. フェーズ 1 で更新したテストを最終化する。
2. 単体テストと E2E を実行し、移行前に失敗したケースが成功に変わることを確認する。
3. 回帰確認として build, lint, docs, test:ci, test:playwright を実行する。

## テスト計画

### 目的
- 現行 DataTables 利用機能が Tabulator でも同等動作することを保証する。
- 先にテストを Tabulator 仕様へ変更し、移行前失敗 -> 移行後成功の流れを明示する。

### 変更対象テストと観点
1. tests/ui.spec.ts
- 結果グリッド表示確認（結果領域の可視性）
- クエリ実行後の行数確認
- Results/Messages タブ切替後の表示整合
- データセット登録後の結果表示

2. tests/example.spec.ts
- 実行結果文字列が結果グリッドに表示されること

3. tests/spec/behavior/v1.3.0/multi-db-attach.spec.ts
- 横断クエリ結果が結果グリッドに表示されること

### テストケース再定義（Tabulator 仕様）
- 行存在確認:
  - 旧: #results-grid tbody tr
  - 新: #results-grid .tabulator-row
- セル内容確認:
  - 旧: #results-grid を全文検索
  - 新: #results-grid .tabulator-cell を優先（必要に応じてコンテナ全文検索を併用）

### 実行順序
1. 先行テスト変更のみ適用して E2E 実行。
2. DataTables 実装のまま失敗することを確認。
3. Tabulator 実装へ移行。
4. 同一テストを再実行し成功を確認。
5. 品質ゲート一式を実行して最終確認。

### 品質ゲート
- npm run build
- npm run lint
- npm run test:ci
- npm run test:playwright
- npm run docs

## 受け入れ条件
- AC-1: 結果グリッドは Tabulator で表示される。
- AC-2: 既存の結果タブ追加/切替/削除仕様は変更なく動作する。
- AC-3: DataTables 依存が package.json から除去される。
- AC-4: 先行変更した Tabulator 仕様テストが、移行前は失敗し移行後に成功する。
- AC-5: 品質ゲート（build/lint/test:ci/test:playwright/docs）を通過する。

## リスクと対策
- リスク: 3rd party DOM 構造変更により E2E が再び壊れる。
- 対策: data-testid 導入を優先し、ライブラリ固有セレクタ依存を段階的に削減する。

- リスク: 大量データ時の描画性能差。
- 対策: paginationSize と layout 設定を固定し、必要に応じて仮想スクロール設定を評価する。

- リスク: CSS 競合で表示崩れ。
- 対策: .results-grid 配下にスコープした Tabulator スタイルを定義し、既存共通スタイルへの影響を避ける。
