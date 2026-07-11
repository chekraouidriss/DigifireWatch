// src/db.js
import sqlite3pkg from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const sqlite3 = sqlite3pkg.verbose();
const __dirname = dirname(fileURLToPath(import.meta.url));

let _db = null;

export function getDb() {
  if (_db) return _db;

  const dbPath = process.env.DB_PATH ?? './data/digifirewatch.db';

  _db = new sqlite3.Database(dbPath, (err) => {
    if (err) { console.error('[db] Failed to open:', err.message); process.exit(1); }
    console.log(`[db] Connected → ${dbPath}`);
  });

  _db.configure('busyTimeout', 3000); 

  _db.run('PRAGMA journal_mode = WAL');
  _db.run('PRAGMA foreign_keys = ON');

  return _db;
}

export function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows ?? []);
    });
  });
}

export function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function (err) {   
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function dbExec(sql) {
  return new Promise((resolve, reject) => {
    getDb().exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function dbTransaction(fn) {
  return new Promise((resolve, reject) => {
    getDb().serialize(async () => {
      try {
        await dbRun('BEGIN TRANSACTION');
        const result = await fn();
        await dbRun('COMMIT');
        resolve(result);
      } catch (err) {
        await dbRun('ROLLBACK');
        reject(err);
      }
    });
  });
}

export async function runMigrations() {
  try {
    await dbExec(`PRAGMA foreign_keys = OFF;`);

    // 1. TABLE ORGANIZATIONS
    await dbExec(`
      CREATE TABLE IF NOT EXISTS organizations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. TABLE USERS
    await dbExec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        organization_id INTEGER DEFAULT 1,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        name TEXT,
        email TEXT,
        ssi_access_level TEXT,
        created_at INTEGER,
        FOREIGN KEY (organization_id) REFERENCES organizations(id)
      );
    `);

    // 3. TABLE CLIENTS
    await dbExec(`
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        organization_id INTEGER DEFAULT 1,
        company_name TEXT NOT NULL,
        hq_address TEXT,
        city TEXT,
        dir_securite_name TEXT NOT NULL,
        dir_securite_phone TEXT NOT NULL,
        dir_securite_email TEXT NOT NULL,
        dir_technique_name TEXT NOT NULL,
        dir_technique_phone TEXT NOT NULL,
        dir_technique_email TEXT NOT NULL,
        adj_technique_name TEXT NOT NULL,
        adj_technique_phone TEXT NOT NULL,
        adj_technique_email TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations(id)
      );
    `);

    // 4. TABLE USER_CLIENTS
    await dbExec(`
      CREATE TABLE IF NOT EXISTS user_clients (
        user_id INTEGER NOT NULL,
        client_id INTEGER NOT NULL,
        PRIMARY KEY (user_id, client_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      );
    `);

    // 5. TABLE ECS_PANELS (Création + Migration douce)
    await dbExec(`
      CREATE TABLE IF NOT EXISTS ecs_panels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        panel_name TEXT NOT NULL,
        panel_model TEXT NOT NULL,
        trb_imei TEXT UNIQUE, 
        ref_broudi TEXT,
        niveau_securite TEXT,
        lignes_detection TEXT,
        resume_installation TEXT,
        location_details TEXT NOT NULL,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      );
    `);

    // ⚡ INJECTION DES NOUVEAUX CHAMPS SSI EXIGÉS PAR L'ENCADREMENT (Sans perte de données)
    await dbExec(`ALTER TABLE ecs_panels ADD COLUMN norme TEXT DEFAULT 'NF';`);
    await dbExec(`ALTER TABLE ecs_panels ADD COLUMN has_cmsi INTEGER DEFAULT 0;`);
    await dbExec(`ALTER TABLE ecs_panels ADD COLUMN has_printer INTEGER DEFAULT 0;`);
    await dbExec(`ALTER TABLE ecs_panels ADD COLUMN loop_count INTEGER DEFAULT 1;`);
    await dbExec(`ALTER TABLE ecs_panels ADD COLUMN equipment_breakdown_json TEXT DEFAULT '{}';`);

    // 6. TABLE TRB_DEVICES
    await dbExec(`
      CREATE TABLE IF NOT EXISTS trb_devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        organization_id INTEGER DEFAULT 1,
        trb_id TEXT,
        imei TEXT UNIQUE NOT NULL,
        online_status TEXT DEFAULT 'ONLINE',
        status TEXT DEFAULT 'discovered',
        last_heartbeat INTEGER,
        FOREIGN KEY (organization_id) REFERENCES organizations(id)
      );
    `);

    // 7. TABLE ALL_GATEWAYS_EVENTS
    await dbExec(`
      CREATE TABLE IF NOT EXISTS all_gateways_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trb_imei TEXT NOT NULL,
        ecs_panel_id INTEGER,
        client_id INTEGER,
        type TEXT NOT NULL,
        raw_data TEXT NOT NULL,
        ts INTEGER NOT NULL,
        hidden_at INTEGER,
        hidden_by INTEGER,
        hidden_reason TEXT,
        received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. TABLE INTERVENTIONS
    await dbExec(`
      CREATE TABLE IF NOT EXISTS interventions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        organization_id INTEGER DEFAULT 1,
        site_id INTEGER,
        ecs_panel_id INTEGER,
        client_id INTEGER,
        technician_id INTEGER,
        reference TEXT NOT NULL,
        type TEXT,
        status TEXT,
        scheduled_at INTEGER,
        started_at INTEGER,
        submitted_at INTEGER,
        validated_at INTEGER,
        FOREIGN KEY (organization_id) REFERENCES organizations(id),
        FOREIGN KEY (technician_id) REFERENCES users(id)
      );
    `);

    await dbExec(`PRAGMA foreign_keys = ON;`);
    console.log('[db] Integration Matrix Restored & Upgraded with SSI Norms Successfully ✓');
  } catch (err) {
    console.error('[db] Restoration error:', err.message);
  }
}