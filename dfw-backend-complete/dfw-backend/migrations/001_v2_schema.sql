-- ============================================================
-- DigiFireWatch v2 — Complete Schema
-- Mirrors production PostgreSQL 16 on 192.168.40.54
-- SQLite-compatible (portable types, no JSONB, no SERIAL)
-- Timestamps: BIGINT epoch seconds throughout
-- ============================================================

-- ── Tenant root
CREATE TABLE IF NOT EXISTS organizations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- ── Clients (companies we service)
CREATE TABLE IF NOT EXISTS clients (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  name            TEXT NOT NULL,
  address         TEXT,
  city            TEXT,
  contact_name    TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  created_at      INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- ── Users
CREATE TABLE IF NOT EXISTS users (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id       INTEGER NOT NULL REFERENCES organizations(id),
  username              TEXT UNIQUE NOT NULL,
  password_hash         TEXT NOT NULL,
  pin_hash              TEXT,
  role                  TEXT NOT NULL CHECK(role IN ('admin','technician','client')),
  name                  TEXT,
  email                 TEXT,
  ssi_access_level      TEXT CHECK(ssi_access_level IN ('I','II','III','IV')),
  certification_reference TEXT,
  created_at            INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- ── M:N — user ↔ client access control
CREATE TABLE IF NOT EXISTS user_clients (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id  INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, client_id)
);

-- ── Panel profiles (parsing ruleset per brand/model)
CREATE TABLE IF NOT EXISTS panel_profiles (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  name            TEXT NOT NULL,
  description     TEXT,
  brand           TEXT,
  model           TEXT,
  encoding        TEXT NOT NULL DEFAULT 'utf-8'
                  CHECK(encoding IN ('utf-8','latin-1','cp850','iso-8859-1')),
  rules_json      TEXT NOT NULL DEFAULT '{}',
  created_at      INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at      INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- ── Sites
CREATE TABLE IF NOT EXISTS sites (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id     INTEGER NOT NULL REFERENCES organizations(id),
  client_id           INTEGER REFERENCES clients(id),
  panel_profile_id    INTEGER REFERENCES panel_profiles(id),
  name                TEXT NOT NULL,
  address             TEXT,
  city                TEXT,
  qr_uuid             TEXT UNIQUE,
  ssi_category        TEXT CHECK(ssi_category IN ('A','B','C','D','E')),
  visit_cadence_days  INTEGER DEFAULT 180,
  contract_reference  TEXT,
  dossier_identite_ref TEXT,
  created_at          INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- ── Locations (floor/zone/room inside a site)
CREATE TABLE IF NOT EXISTS locations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id    INTEGER NOT NULL REFERENCES sites(id),
  name       TEXT NOT NULL,
  level      TEXT,
  zone_code  TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- ── Equipment
CREATE TABLE IF NOT EXISTS equipment (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id         INTEGER NOT NULL REFERENCES sites(id),
  location_id     INTEGER REFERENCES locations(id),
  type            TEXT NOT NULL,
  label           TEXT,
  serial_number   TEXT,
  loop_address    TEXT,
  zone            TEXT,
  status          TEXT NOT NULL DEFAULT 'ok'
                  CHECK(status IN ('ok','fault','replaced','decommissioned')),
  installed_at    INTEGER,
  created_at      INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- ── TRB142 gateway devices
CREATE TABLE IF NOT EXISTS trb_devices (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id INTEGER REFERENCES organizations(id),
  client_id       INTEGER REFERENCES clients(id),
  site_id         INTEGER REFERENCES sites(id),
  mac             TEXT,
  imei            TEXT,
  trb_id          TEXT,
  firmware        TEXT,
  status          TEXT NOT NULL DEFAULT 'discovered'
                  CHECK(status IN ('discovered','claimed','decommissioned')),
  last_heartbeat  INTEGER,
  last_seen_at    INTEGER,
  buffer_size     INTEGER DEFAULT 0,
  serial_ok       INTEGER DEFAULT 1,
  online_status   TEXT NOT NULL DEFAULT 'OFFLINE'
                  CHECK(online_status IN ('ONLINE','STALE','OFFLINE')),
  created_at      INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- ── Gateway status log
CREATE TABLE IF NOT EXISTS gateway_status_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  trb_id       INTEGER NOT NULL REFERENCES trb_devices(id),
  from_status  TEXT,
  to_status    TEXT NOT NULL,
  reason       TEXT,
  source       TEXT,
  logged_at    INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- ── TRB device assignment audit log
CREATE TABLE IF NOT EXISTS trb_device_assignments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  trb_device_id INTEGER NOT NULL REFERENCES trb_devices(id),
  action       TEXT NOT NULL CHECK(action IN ('claimed','decommissioned','reassigned')),
  client_id    INTEGER REFERENCES clients(id),
  site_id      INTEGER REFERENCES sites(id),
  performed_by INTEGER REFERENCES users(id),
  performed_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  notes        TEXT
);

-- ── Events (fire panel events ingested via MQTT or manual)
CREATE TABLE IF NOT EXISTS events (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id      INTEGER REFERENCES organizations(id),
  site_id              INTEGER REFERENCES sites(id),
  client_id            INTEGER REFERENCES clients(id),
  equipment_id         INTEGER REFERENCES equipment(id),
  intervention_test_id INTEGER,
  trb_device_id        INTEGER REFERENCES trb_devices(id),
  type                 TEXT NOT NULL DEFAULT 'UNKNOWN',
  raw_data             TEXT,
  zone                 TEXT,
  point                TEXT,
  location_label       TEXT,
  ts                   INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  hidden_at            INTEGER,
  hidden_by            INTEGER REFERENCES users(id),
  hidden_reason        TEXT
);

-- ── Interventions
CREATE TABLE IF NOT EXISTS interventions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  site_id         INTEGER NOT NULL REFERENCES sites(id),
  client_id       INTEGER REFERENCES clients(id),
  technician_id   INTEGER REFERENCES users(id),
  reference       TEXT UNIQUE,
  type            TEXT NOT NULL DEFAULT 'preventive'
                  CHECK(type IN ('preventive','corrective')),
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK(status IN ('draft','in_progress','suspended','submitted','returned','validated','locked')),
  day_number      INTEGER NOT NULL DEFAULT 1,
  scheduled_at    INTEGER,
  started_at      INTEGER,
  submitted_at    INTEGER,
  validated_at    INTEGER,
  locked_at       INTEGER,
  sha256          TEXT,
  notes           TEXT,
  created_at      INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at      INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- ── Intervention states (état des lieux — immutable snapshots)
CREATE TABLE IF NOT EXISTS intervention_states (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  intervention_id  INTEGER NOT NULL REFERENCES interventions(id),
  snapshot_type    TEXT NOT NULL
                   CHECK(snapshot_type IN ('initial','end_of_day','resume','final')),
  day_number       INTEGER NOT NULL DEFAULT 1,
  fire_count       INTEGER DEFAULT 0,
  fault_count      INTEGER DEFAULT 0,
  uga_state        TEXT,
  aes_voltage      REAL,
  surveillance_suspended INTEGER DEFAULT 0,
  compensatory_measures  TEXT,
  notes            TEXT,
  panel_photo_path TEXT,
  captured_at      INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- ── Anomalies
CREATE TABLE IF NOT EXISTS anomalies (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  intervention_id     INTEGER NOT NULL REFERENCES interventions(id),
  equipment_id        INTEGER REFERENCES equipment(id),
  site_id             INTEGER NOT NULL REFERENCES sites(id),
  fingerprint         TEXT NOT NULL,
  anomaly_type        TEXT NOT NULL,
  description         TEXT,
  status              TEXT NOT NULL DEFAULT 'to_treat'
                      CHECK(status IN ('to_treat','in_progress','resolved','deferred','reopened')),
  fix_failed_count    INTEGER NOT NULL DEFAULT 0,
  previous_anomaly_id INTEGER REFERENCES anomalies(id),
  resolved_at         INTEGER,
  deferred_until      INTEGER,
  created_at          INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at          INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- ── Anomaly history log
CREATE TABLE IF NOT EXISTS anomaly_history (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  anomaly_id   INTEGER NOT NULL REFERENCES anomalies(id),
  event_type   TEXT NOT NULL,
  performed_by INTEGER REFERENCES users(id),
  notes        TEXT,
  logged_at    INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- ── Intervention tests (essais réglementaires)
CREATE TABLE IF NOT EXISTS intervention_tests (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  intervention_id     INTEGER NOT NULL REFERENCES interventions(id),
  equipment_id        INTEGER REFERENCES equipment(id),
  label               TEXT NOT NULL,
  match_mode          TEXT NOT NULL DEFAULT 'manual_only'
                      CHECK(match_mode IN ('strict','loose','manual_only')),
  match_zone          TEXT,
  match_event_type    TEXT,
  window_seconds      INTEGER DEFAULT 30,
  result              TEXT CHECK(result IN ('pass','fail','pending')),
  matched_event_id    INTEGER REFERENCES events(id),
  validated_at        INTEGER,
  notes               TEXT,
  created_at          INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- ── Photos
CREATE TABLE IF NOT EXISTS photos (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  intervention_id INTEGER REFERENCES interventions(id),
  anomaly_id      INTEGER REFERENCES anomalies(id),
  equipment_id    INTEGER REFERENCES equipment(id),
  file_path       TEXT NOT NULL,
  sha256          TEXT,
  purpose         TEXT CHECK(purpose IN ('initial_state','before','after','panel','other')),
  width           INTEGER,
  height          INTEGER,
  uploaded_by     INTEGER REFERENCES users(id),
  uploaded_at     INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- ── Signatures
CREATE TABLE IF NOT EXISTS signatures (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  intervention_id INTEGER NOT NULL REFERENCES interventions(id),
  signer_type     TEXT NOT NULL CHECK(signer_type IN ('technician','client','chef_etablissement')),
  signer_name     TEXT,
  file_path       TEXT NOT NULL,
  signed_at       INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- ── Checklist templates
CREATE TABLE IF NOT EXISTS checklist_templates (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  name            TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'preventive',
  items_json      TEXT NOT NULL DEFAULT '[]',
  created_at      INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
