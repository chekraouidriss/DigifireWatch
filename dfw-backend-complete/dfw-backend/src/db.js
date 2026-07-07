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
    // Désactiver temporairement pour reconstruire sans conflit
    await dbExec(`PRAGMA foreign_keys = OFF;`);

    // 1. TABLE ORGANIZATIONS (D'origine)
    await dbExec(`
      CREATE TABLE IF NOT EXISTS organizations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. TABLE USERS (D'origine preservée 100%)
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

    // 3. TABLE CLIENTS (Refactorisée avec les 3 contacts requis)
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

    // 4. TABLE USER_CLIENTS (D'origine preservée pour la liaison technique d'accès)
    await dbExec(`
      CREATE TABLE IF NOT EXISTS user_clients (
        user_id INTEGER NOT NULL,
        client_id INTEGER NOT NULL,
        PRIMARY KEY (user_id, client_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      );
    `);

    // 5. TABLE ECS_PANELS (Remplace Sites avec le schéma industriel jdid)
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

    // 6. TABLE TRB_DEVICES (D'origine avec le statut dynamic jdid)
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

    // 7. TABLE ALL_GATEWAYS_EVENTS (La table unifiée de journalisation globale)
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

    // 8. TABLE INTERVENTIONS (D'origine preservée 100% pour l'historique des techniciens)
    await dbExec(`
      CREATE TABLE IF NOT EXISTS interventions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        organization_id INTEGER DEFAULT 1,
        site_id INTEGER, -- Reste nullable ou mappé optionnellement
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

    // Réactiver le contrôle d'intégrité
    await dbExec(`PRAGMA foreign_keys = ON;`);
    console.log('[db] Integration Matrix Restored Successfully ✓');
  } catch (err) {
    console.error('[db] Restoration error:', err.message);
  }
}