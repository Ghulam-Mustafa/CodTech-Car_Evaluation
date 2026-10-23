import Database from "better-sqlite3";

export const db = new Database("cars.db");

db.exec(`CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, email TEXT UNIQUE, hash TEXT);
CREATE TABLE IF NOT EXISTS evaluations(id INTEGER PRIMARY KEY, user_id INTEGER, car TEXT, input TEXT, result TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP);`);
