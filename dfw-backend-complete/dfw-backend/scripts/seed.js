// scripts/seed.js
import 'dotenv/config';
import sqlite3pkg from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { runMigrations } from '../src/db.js';

const sqlite3 = sqlite3pkg.verbose();
const DB_PATH = process.env.DB_PATH ?? './data/digifirewatch.db';
const db = new sqlite3.Database(DB_PATH);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

async function seed() {
  console.log('🌱 Start Refactored Enterprise Seeding...');
  
  await runMigrations();

  // 1. Insertion de Clients de Démo avec la structure de 3 Contacts exigée
  await run(`
    INSERT INTO clients (
      id, company_name, hq_address, city,
      dir_securite_name, dir_securite_phone, dir_securite_email,
      dir_technique_name, dir_technique_phone, dir_technique_email,
      adj_technique_name, adj_technique_phone, adj_technique_email
    ) VALUES (
      1, 'Marriott Hotels Maroc', 'Bd Corniche', 'Casablanca',
      'Youssef Tazi', '+212611223344', 'securite.casa@marriott.com',
      'Anass Alami', '+212622334455', 'tech.director@marriott.com',
      'Karim Bennani', '+212633445566', 'tech.adj@marriott.com'
    )
  `);

  await run(`
    INSERT INTO clients (
      id, company_name, hq_address, city,
      dir_securite_name, dir_securite_phone, dir_securite_email,
      dir_technique_name, dir_technique_phone, dir_technique_email,
      adj_technique_name, adj_technique_phone, adj_technique_email
    ) VALUES (
      2, 'Complexe Commercial Mac Center', 'Avenue Hassan II', 'Agadir',
      'Driss Chekraoui', '+212677889900', 'driss.sec@maccenter.ma',
      'Hicham Imlal', '+212688990011', 'hicham.tech@maccenter.ma',
      'Saad Tazi', '+212699001122', 'saad.adj@maccenter.ma'
    )
  `);

  // 2. Insertion de Centrales d'Alarme ECS (Baltic S12, etc.)
  await run(`
    INSERT INTO ecs_panels (id, client_id, panel_name, panel_model, trb_imei, ref_broudi, niveau_securite, lignes_detection, resume_installation, location_details)
    VALUES (1, 1, 'Centrale Principale Baltic - Bloc A', 'Baltic S12', '356938035643809', 'BR-9982-X', 'Catégorie A', 'Boucles 1 à 4', 'ym:50 DI, 200 DM, 1 SIM', 'Local Technique RDC')
  `);

  await run(`
    INSERT INTO ecs_panels (id, client_id, panel_name, panel_model, trb_imei, ref_broudi, niveau_securite, lignes_detection, resume_installation, location_details)
    VALUES (2, 2, 'Centrale Détection - Zone Restauration', 'Chubb Delta', '356938035643820', 'CH-4412', 'Catégorie B', 'Lignes Radiales 1-2', 'ym:20 DI, 50 DM', 'Poste Sécurité Extérieur')
  `);

  // 3. Registre Initial des Modems TRB
  await run(`INSERT INTO trb_devices (id, trb_id, imei, online_status, status, last_heartbeat) VALUES (1, 'trb142-356938035643809', '356938035643809', 'ONLINE', 'claimed', strftime('%s','now'))`);
  await run(`INSERT INTO trb_devices (id, trb_id, imei, online_status, status, last_heartbeat) VALUES (2, 'trb142-356938035643820', '356938035643820', 'ONLINE', 'claimed', strftime('%s','now'))`);
  await run(`INSERT INTO trb_devices (id, trb_id, imei, online_status, status, last_heartbeat) VALUES (3, 'trb142-999999999999999', '999999999999999', 'ONLINE', 'discovered', strftime('%s','now'))`);

  // 4. Événements initiaux dans la table unifiée journalisée
  const now = Math.floor(Date.now() / 1000);
  await run(`INSERT INTO all_gateways_events (trb_imei, ecs_panel_id, client_id, type, raw_data, ts) VALUES ('356938035643809', 1, 1, 'FIRE', '02/07/26 14:36:46 ALARME INCENDIE ZONE CUISINE', ?)`, [now - 300]);
  await run(`INSERT INTO all_gateways_events (trb_imei, ecs_panel_id, client_id, type, raw_data, ts) VALUES ('356938035643809', 1, 1, 'RESTORE', '02/07/26 14:36:56 REARMEMENT MANUEL', ?)`, [now - 200]);
  await run(`INSERT INTO all_gateways_events (trb_imei, ecs_panel_id, client_id, type, raw_data, ts) VALUES ('999999999999999', NULL, NULL, 'FAULT', '02/07/26 15:00:10 DEFAUT BATTERIE TRB INCONNUE', ?)`, [now - 50]);

  console.log('✅ Refactored Seeding Complete! Data is ready.');
  db.close();
}

seed().catch(console.error);