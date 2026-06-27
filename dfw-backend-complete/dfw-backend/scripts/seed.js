// scripts/seed.js
// Seeds the local database with realistic DigiFireWatch data.
// Clients: Yassin, Driss, Mac (replaces Sami per supervisor update)
// Run once: node scripts/seed.js

import 'dotenv/config';
import sqlite3pkg from 'sqlite3';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const sqlite3   = sqlite3pkg.verbose();
const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH   = process.env.DB_PATH ?? './data/digifirewatch.db';

const db = new sqlite3.Database(DB_PATH);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
  });
}
function exec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, err => err ? reject(err) : resolve());
  });
}

async function seed() {
  console.log('🌱 Seeding DigiFireWatch local database...\n');

  // Apply schema first
  try {
    const schema = readFileSync(join(__dirname, '../migrations/001_v2_schema.sql'), 'utf8');
    await exec(schema);
    console.log('✓ Schema applied');
  } catch (e) {
    if (!e.message.includes('already exists')) throw e;
    console.log('✓ Schema already applied');
  }

  await run('PRAGMA foreign_keys = ON');

  // ── Organization
  const existingOrg = await get('SELECT id FROM organizations WHERE id = 1');
  if (!existingOrg) {
    await run(`INSERT INTO organizations (id, name) VALUES (1, 'DIGITAL ID SARL')`);
    console.log('✓ Organisation créée');
  } else {
    console.log('· Organisation déjà présente');
  }

  // ── Panel profiles
  const profilesData = [
    {
      id: 1,
      name: 'Esser IQ8 (FR)',
      brand: 'Esser',
      model: 'IQ8Control',
      encoding: 'utf-8',
      rules_json: JSON.stringify({
        encoding: 'utf-8',
        event_types: {
          FIRE:    ['FEUER', 'FIRE', 'ALARM', 'ALARME'],
          FAULT:   ['STORUNG', 'FAULT', 'TROUBLE', 'DEFAUT'],
          RESTORE: ['KLAR', 'CLEAR', 'RESTORE', 'NORMAL', 'FIN DEFAUT'],
          RESET:   ['RESET', 'REARMEMENT'],
          TEST:    ['TEST'],
          EVAC:    ['EVACUATION'],
          POWER:   ['SECTEUR', 'ALIMENTATION'],
          INIT:    ['INITIALISATION', 'CONFIGURATION'],
        },
        ignore_lines: ['^---', '^\\s*$', '^Page \\d'],
      }),
    },
    {
      id: 2,
      name: 'Finsecur BALTIC-512 (FR)',
      brand: 'Finsecur',
      model: 'BALTIC-512',
      encoding: 'cp850',
      rules_json: JSON.stringify({
        encoding: 'cp850',
        event_types: {
          FIRE:    ['ALARME POINT', 'ALARME ZONE'],
          FAULT:   ['DEFAUT COM', 'Dft', 'DEFAUT'],
          RESTORE: ['Fin DEFAUT', 'Fin Dft', 'FIN ALARME'],
          RESET:   ['REARMEMENT MANUEL', 'RESET'],
          TEST:    ['TEST'],
          EVAC:    ['Début Evacuation', 'Debut Evacuation', 'EVACUATION'],
          POWER:   ['Défaut Secteur', 'Defaut Secteur', 'ALIMENTATION'],
          INIT:    ['Initialisation', 'Mise a jour configuration', 'REGLAGE'],
          ACK:     ['Acquittement', 'ACQ'],
        },
        fields: {
          zone:  { regex: 'Z(\\d{3})' },
          point: { regex: 'Z(\\d{3})\\s+B(\\d+)\\s+A\\.?(\\d{3})' },
        },
        ignore_lines: ['^---', '^\\s*$'],
      }),
    },
  ];

  for (const p of profilesData) {
    const existing = await get('SELECT id FROM panel_profiles WHERE id = ?', [p.id]);
    if (!existing) {
      await run(
        `INSERT INTO panel_profiles (id, organization_id, name, brand, model, encoding, rules_json)
         VALUES (?, 1, ?, ?, ?, ?, ?)`,
        [p.id, p.name, p.brand, p.model, p.encoding, p.rules_json]
      );
      console.log(`✓ Profil panneau créé: ${p.name}`);
    } else {
      console.log(`· Profil panneau déjà présent: ${p.name}`);
    }
  }

  // ── Users
  const BCRYPT_ROUNDS = 12;
  const adminHash = await bcrypt.hash('admin1234', BCRYPT_ROUNDS);
  const techHash  = await bcrypt.hash('tech1234',  BCRYPT_ROUNDS);

  const usersData = [
    { id: 1, username: 'admin', password_hash: adminHash, role: 'admin',      name: 'Administrateur' },
    { id: 2, username: 'tech1', password_hash: techHash,  role: 'technician', name: 'Technicien 1'   },
    { id: 3, username: 'tech2', password_hash: techHash,  role: 'technician', name: 'Technicien 2'   },
  ];

  for (const u of usersData) {
    const existing = await get('SELECT id FROM users WHERE id = ?', [u.id]);
    if (!existing) {
      await run(
        `INSERT INTO users (id, organization_id, username, password_hash, role, name)
         VALUES (?, 1, ?, ?, ?, ?)`,
        [u.id, u.username, u.password_hash, u.role, u.name]
      );
      console.log(`✓ Utilisateur créé: ${u.username} (${u.role})`);
    } else {
      console.log(`· Utilisateur déjà présent: ${u.username}`);
    }
  }

  // ── Clients: Yassin, Driss, Mac (Mac remplace Sami — mise à jour superviseur)
  const clientsData = [
    { id: 1, name: 'Yassin',  city: 'Agadir',     contact_name: 'Yassin Alami'   },
    { id: 2, name: 'Driss',   city: 'Casablanca',  contact_name: 'Driss Benali'   },
    { id: 3, name: 'Mac',     city: 'Marrakech',   contact_name: 'Mac Tazi'       },
  ];

  for (const c of clientsData) {
    const existing = await get('SELECT id FROM clients WHERE id = ?', [c.id]);
    if (!existing) {
      await run(
        `INSERT INTO clients (id, organization_id, name, city, contact_name) VALUES (?, 1, ?, ?, ?)`,
        [c.id, c.name, c.city, c.contact_name]
      );
      console.log(`✓ Client créé: ${c.name}`);
    } else {
      console.log(`· Client déjà présent: ${c.name}`);
    }
  }

  // ── user_clients assignments
  const assignments = [
    { user_id: 2, client_id: 1 },  // tech1 → Yassin
    { user_id: 2, client_id: 3 },  // tech1 → Mac
    { user_id: 3, client_id: 2 },  // tech2 → Driss
  ];
  for (const a of assignments) {
    await run(
      'INSERT OR IGNORE INTO user_clients (user_id, client_id) VALUES (?, ?)',
      [a.user_id, a.client_id]
    );
  }
  console.log('✓ Accès utilisateurs-clients assignés');

  // ── Sites
  const sitesData = [
    { id: 1, client_id: 1, name: 'Hôtel Atlas',       city: 'Agadir',     panel_profile_id: 2, ssi_category: 'A', contract_reference: 'CTR-2024-001' },
    { id: 2, client_id: 2, name: 'Résidence Agadir',   city: 'Casablanca', panel_profile_id: 1, ssi_category: 'B', contract_reference: 'CTR-2024-002' },
    { id: 3, client_id: 3, name: 'Complexe Mac Center', city: 'Marrakech', panel_profile_id: 1, ssi_category: 'C', contract_reference: 'CTR-2024-003' },
  ];

  for (const s of sitesData) {
    const existing = await get('SELECT id FROM sites WHERE id = ?', [s.id]);
    if (!existing) {
      await run(
        `INSERT INTO sites (id, organization_id, client_id, panel_profile_id, name, city, ssi_category, contract_reference, qr_uuid)
         VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?)`,
        [s.id, s.client_id, s.panel_profile_id, s.name, s.city, s.ssi_category, s.contract_reference, crypto.randomUUID()]
      );
      console.log(`✓ Site créé: ${s.name}`);
    } else {
      console.log(`· Site déjà présent: ${s.name}`);
    }
  }

  // ── TRB Devices (with IMEI — replaces MAC-based identity)
  const trbData = [
    {
      id: 1, client_id: 1, site_id: 1,
      imei: '356938035643809', trb_id: 'TRB-43809',
      mac: '8645ab8f39c7', status: 'claimed', online_status: 'ONLINE',
      last_heartbeat: Math.floor(Date.now() / 1000) - 15,
    },
    {
      id: 2, client_id: 2, site_id: 2,
      imei: '356938035643820', trb_id: 'TRB-43820',
      mac: '3e0f42c742fc', status: 'claimed', online_status: 'OFFLINE',
      last_heartbeat: Math.floor(Date.now() / 1000) - 14400,
    },
    {
      id: 3, client_id: 3, site_id: 3,
      imei: '356938035643831', trb_id: 'TRB-43831',
      mac: 'fallback-fa0f8b2d8c3a', status: 'claimed', online_status: 'STALE',
      last_heartbeat: Math.floor(Date.now() / 1000) - 300,
    },
    {
      id: 4, client_id: null, site_id: null,
      imei: '356938035643842', trb_id: 'TRB-43842',
      mac: 'aa11bb22cc33', status: 'discovered', online_status: 'ONLINE',
      last_heartbeat: Math.floor(Date.now() / 1000) - 30,
    },
  ];

  for (const t of trbData) {
    const existing = await get('SELECT id FROM trb_devices WHERE id = ?', [t.id]);
    if (!existing) {
      await run(
        `INSERT INTO trb_devices
           (id, organization_id, client_id, site_id, imei, trb_id, mac, status, online_status, last_heartbeat)
         VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [t.id, t.client_id, t.site_id, t.imei, t.trb_id, t.mac, t.status, t.online_status, t.last_heartbeat]
      );
      console.log(`✓ TRB créé: ${t.trb_id} (${t.status})`);
    } else {
      console.log(`· TRB déjà présent: ${t.trb_id}`);
    }
  }

  // ── Sample events
  const now = Math.floor(Date.now() / 1000);
  const eventsData = [
    { site_id: 1, client_id: 1, trb_device_id: 1, type: 'FIRE',    raw_data: 'ALARME POINT Z001 B3 A.001', zone: 'Z001', ts: now - 300  },
    { site_id: 1, client_id: 1, trb_device_id: 1, type: 'RESTORE', raw_data: 'Fin ALARME Z001',            zone: 'Z001', ts: now - 240  },
    { site_id: 1, client_id: 1, trb_device_id: 1, type: 'FAULT',   raw_data: 'DEFAUT COM B1-A001',         zone: null,   ts: now - 3600 },
    { site_id: 2, client_id: 2, trb_device_id: 2, type: 'POWER',   raw_data: 'Défaut Secteur ECS',         zone: null,   ts: now - 7200 },
    { site_id: 2, client_id: 2, trb_device_id: 2, type: 'FAULT',   raw_data: 'Dft D.Sonores 1',            zone: null,   ts: now - 5400 },
    { site_id: 3, client_id: 3, trb_device_id: 3, type: 'TEST',    raw_data: 'TEST ZONE 002',              zone: 'Z002', ts: now - 1800 },
    { site_id: 3, client_id: 3, trb_device_id: 3, type: 'INIT',    raw_data: 'Initialisation système',     zone: null,   ts: now - 900  },
    { site_id: 1, client_id: 1, trb_device_id: 1, type: 'FIRE',    raw_data: 'ALARME ZONE 001',            zone: 'Z001', ts: now - 86400 },
    { site_id: 1, client_id: 1, trb_device_id: 1, type: 'RESET',   raw_data: 'REARMEMENT MANUEL',          zone: null,   ts: now - 85000 },
  ];

  let eventCount = 0;
  for (const e of eventsData) {
    await run(
      `INSERT INTO events (organization_id, site_id, client_id, trb_device_id, type, raw_data, zone, ts)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
      [e.site_id, e.client_id, e.trb_device_id, e.type, e.raw_data, e.zone ?? null, e.ts]
    );
    eventCount++;
  }
  console.log(`✓ ${eventCount} événements de démonstration insérés`);

  // ── Intervention examples
  const interventionsData = [
    {
      id: 1, site_id: 1, client_id: 1, technician_id: 2,
      reference: 'INT-2026-001', type: 'preventive', status: 'validated',
      scheduled_at: now - 86400 * 7, started_at: now - 86400 * 7 + 3600,
      submitted_at: now - 86400 * 6, validated_at: now - 86400 * 5,
    },
    {
      id: 2, site_id: 2, client_id: 2, technician_id: 3,
      reference: 'INT-2026-002', type: 'corrective', status: 'in_progress',
      scheduled_at: now - 3600, started_at: now - 3000,
    },
    {
      id: 3, site_id: 3, client_id: 3, technician_id: 2,
      reference: 'INT-2026-003', type: 'preventive', status: 'draft',
      scheduled_at: now + 86400 * 3,
    },
  ];

  for (const i of interventionsData) {
    const existing = await get('SELECT id FROM interventions WHERE id = ?', [i.id]);
    if (!existing) {
      await run(
        `INSERT INTO interventions
           (id, organization_id, site_id, client_id, technician_id, reference, type, status, scheduled_at, started_at, submitted_at, validated_at)
         VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [i.id, i.site_id, i.client_id, i.technician_id, i.reference, i.type, i.status,
         i.scheduled_at ?? null, i.started_at ?? null, i.submitted_at ?? null, i.validated_at ?? null]
      );
      console.log(`✓ Intervention créée: ${i.reference} (${i.status})`);
    }
  }

  console.log('\n✅ Seed terminé avec succès!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Comptes disponibles :');
  console.log('  admin   / admin1234  → Accès complet');
  console.log('  tech1   / tech1234   → Yassin + Mac');
  console.log('  tech2   / tech1234   → Driss');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  db.close();
}

seed().catch(err => {
  console.error('❌ Seed échoué:', err);
  db.close();
  process.exit(1);
});
