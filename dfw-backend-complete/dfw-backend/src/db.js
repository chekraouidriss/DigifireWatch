// src/db.js
// Async SQLite3 wrapper — compatible with Node 24 (no native bindings like better-sqlite3)
// All methods return Promises, mirroring how PostgreSQL pg driver works on production.

import sqlite3pkg from 'sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const sqlite3 = sqlite3pkg.verbose();
const __dirname = dirname(fileURLToPath(import.meta.url));

let _db = null;

// ── Open / initialise the database
export function getDb() {
  if (_db) return _db;

  const dbPath = process.env.DB_PATH ?? './data/digifirewatch.db';

  _db = new sqlite3.Database(dbPath, (err) => {
    if (err) { console.error('[db] Failed to open:', err.message); process.exit(1); }
    console.log(`[db] Connected → ${dbPath}`);
  });

  // WAL mode for concurrent reads + crash safety (matches production behaviour)
  _db.run('PRAGMA journal_mode = WAL');
  _db.run('PRAGMA foreign_keys = ON');

  return _db;
}

// ── Promisified helpers (drop-in for pg-style await db.query())

/** SELECT — returns array of rows */
export function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows ?? []);
    });
  });
}

/** SELECT single row — returns row or undefined */
export function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

/** INSERT / UPDATE / DELETE — returns { lastID, changes } */
export function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function (err) {   // must be function() for `this`
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/** Run a block of SQL statements (migrations, schema setup) */
export function dbExec(sql) {
  return new Promise((resolve, reject) => {
    getDb().exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/** Serialised transaction helper */
export async function dbTransaction(fn) {
  await dbRun('BEGIN');
  try {
    const result = await fn();
    await dbRun('COMMIT');
    return result;
  } catch (err) {
    await dbRun('ROLLBACK');
    throw err;
  }
}

// ── Run SQL migration file on startup
export async function runMigrations() {
  const migrationPath = join(__dirname, '../migrations/001_v2_schema.sql');
  try {
    const sql = readFileSync(migrationPath, 'utf8');
    await dbExec(sql);
    console.log('[db] Migrations applied ✓');
  } catch (err) {
    // Already applied — safe to ignore "already exists" on CREATE IF NOT EXISTS
    if (!err.message?.includes('already exists')) {
      console.error('[db] Migration error:', err.message);
    }
  }
}
