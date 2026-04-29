/**
 * テスト用 SQLite フィクスチャ DB を生成するスクリプト。
 * node tests/fixtures/generate-fixtures.cjs
 */
const path = require('path');
const sqlite3 = require('node:sqlite');
const fs = require('fs');

const out = path.join(__dirname);

// main.db: users テーブルを持つメイン DB
{
  const dbPath = path.join(out, 'main.db');
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  const db = new sqlite3.DatabaseSync(dbPath);
  db.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)`);
  db.exec(`INSERT INTO users VALUES (1, 'Alice')`);
  db.exec(`INSERT INTO users VALUES (2, 'Bob')`);
  db.close();
  console.log('Generated:', dbPath);
}

// sub.db: orders テーブルを持つ追加 DB
{
  const dbPath = path.join(out, 'sub.db');
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  const db = new sqlite3.DatabaseSync(dbPath);
  db.exec(`CREATE TABLE orders (id INTEGER PRIMARY KEY, product TEXT, amount INTEGER)`);
  db.exec(`INSERT INTO orders VALUES (1, 'Apple', 10)`);
  db.exec(`INSERT INTO orders VALUES (2, 'Banana', 5)`);
  db.close();
  console.log('Generated:', dbPath);
}
