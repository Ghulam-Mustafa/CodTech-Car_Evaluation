const Database = require("better-sqlite3");
const path = require("path");
require("dotenv").config();

const dbPath = process.env.DB_PATH || "./data.sqlite";
const db = new Database(path.resolve(__dirname, dbPath));

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    make TEXT,
    model TEXT,
    manufacture_year INTEGER NOT NULL,
    num_services INTEGER NOT NULL,
    major_accidents INTEGER NOT NULL,
    minor_accidents INTEGER NOT NULL,
    score REAL NOT NULL,
    condition TEXT NOT NULL,
    price_range_low INTEGER NOT NULL,
    price_range_high INTEGER NOT NULL,
    factors_json TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

module.exports = db;
