# SQLite-Sample

## 概要
このプロジェクトは、ブラウザ上でsqliteの処理を行うサンプルです。
SQLite working on browser Sample

[![Licence](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE) 
## 作成について
このプロジェクトはsql.jsでの実装をClaude 3.7 Sonnetを使ってsqlite.orgに移植したものです。

## セットアップ手順
1. リポジトリをクローンします。
    ```sh
    git clone https://github.com/nojaja/SQLite-Sample.git
    ```
2. 必要な依存関係をインストールします。
    ```sh
    npm install
    ```
3. 開発サーバーを起動します。
    ```sh
    npm start
    ```
4. open browser
    ```
    http://localhost:8080
    ```

## プログラムの仕様

### 機能
* 


## 利点と制限事項
### 利点
- すべての処理がブラウザ上で完結するため、サーバーサイドの設定が不要です。

### 制限事項
- ブラウザの性能に依存するため、大規模なデータセットの処理には向いていません。
- WebAssemblyのサポートが必要です。

## License

Licensed under the [MIT](LICENSE) License.
