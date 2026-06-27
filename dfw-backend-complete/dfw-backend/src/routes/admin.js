// src/routes/admin.js
// All routes: /api/admin/** — every handler requires role=admin.
//
// KEY SECURITY FIX in POST /api/admin/users:
//   • The endpoint no longer returns a JWT token.
//   • It returns only the created user object.
//   • The active admin session is completely unaffected.

import { Router } from 'express';
import crypto from 'crypto'; // <-- CORRECTIF 1 : Importation indispensable pour crypto.randomUUID()
import { dbAll, dbGet, dbRun, dbTransaction } from '../db.js';
import { hashPassword, buildUserPayload } from '../auth.js';
import { authenticate, requireRole } from '../middleware/authenticate.js';

const router  = Router();
// CORRECTIF 2 : Utilisation directe des middlewares dans un tableau pour Express
const adminOnly = [authenticate, requireRole('admin')];

// ═══════════════════════════════════════════════════════════
// USERS — CRUD
// ═══════════════════════════════════════════════════════════

// GET /api/admin/users
router.get('/users', adminOnly, async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT u.id, u.username, u.role, u.name, u.email,
              u.ssi_access_level, u.created_at,
              GROUP_CONCAT(uc.client_id) AS client_ids
       FROM users u
       LEFT JOIN user_clients uc ON uc.user_id = u.id
       GROUP BY u.id
       ORDER BY u.id`
    );
    const users = rows.map(u => ({
      ...u,
      client_ids: u.client_ids ? u.client_ids.split(',').map(Number) : [],
    }));
    res.json({ users });
  } catch (err) {
    console.error('[admin/users GET]', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// POST /api/admin/users — create a new user account
router.post('/users', adminOnly, async (req, res) => {
  try {
    const {
      username,
      password,
      name,
      role,
      email,
      ssi_access_level,
      client_ids,
    } = req.body ?? {};

    if (!username || !password || !role) {
      return res.status(400).json({
        message: 'Les champs username, password et role sont requis.',
      });
    }

    const VALID_ROLES = ['admin', 'technician', 'client'];
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: `Rôle invalide. Valeurs acceptées : ${VALID_ROLES.join(', ')}.` });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Mot de passe trop court (minimum 8 caractères).' });
    }

    const existing = await dbGet(
      'SELECT id FROM users WHERE username = ?',
      [username.trim().toLowerCase()]
    );
    if (existing) {
      return res.status(409).json({ message: 'Cet identifiant est déjà utilisé.' });
    }

    const password_hash = await hashPassword(password);

    const { lastID } = await dbTransaction(async () => {
      const result = await dbRun(
        `INSERT INTO users
           (organization_id, username, password_hash, name, role, email, ssi_access_level, created_at)
         VALUES (1, ?, ?, ?, ?, ?, ?, strftime('%s','now'))`,
        [
          username.trim().toLowerCase(),
          password_hash,
          name?.trim() || username,
          role,
          email?.trim() || null,
          ssi_access_level || null,
        ]
      );

      if (role !== 'admin' && Array.isArray(client_ids) && client_ids.length > 0) {
        for (const cid of client_ids) {
          await dbRun(
            'INSERT OR IGNORE INTO user_clients (user_id, client_id) VALUES (?, ?)',
            [result.lastID, Number(cid)]
          );
        }
      }

      return result;
    });

    const created = await dbGet('SELECT * FROM users WHERE id = ?', [lastID]);

    return res.status(201).json({
      user: buildUserPayload(created),
    });

  } catch (err) {
    console.error('[admin/users POST]', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// PUT /api/admin/users/:id
router.put('/users/:id', adminOnly, async (req, res) => {
  try {
    const { name, role, email, password, client_ids } = req.body ?? {};
    const id = Number(req.params.id);

    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ message: 'Mot de passe trop court (minimum 8 caractères).' });
      }
      const hash = await hashPassword(password);
      await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
    }
    if (name)  await dbRun('UPDATE users SET name  = ? WHERE id = ?', [name.trim(), id]);
    if (role)  await dbRun('UPDATE users SET role  = ? WHERE id = ?', [role, id]);
    if (email) await dbRun('UPDATE users SET email = ? WHERE id = ?', [email.trim(), id]);

    if (client_ids !== undefined) {
      await dbRun('DELETE FROM user_clients WHERE user_id = ?', [id]);
      for (const cid of (client_ids ?? [])) {
        await dbRun(
          'INSERT OR IGNORE INTO user_clients (user_id, client_id) VALUES (?, ?)',
          [id, Number(cid)]
        );
      }
    }

    const user = await dbGet('SELECT * FROM users WHERE id = ?', [id]);
    res.json({ user: buildUserPayload(user) });
  } catch (err) {
    console.error('[admin/users PUT]', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (id === req.user.id) {
      return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte.' });
    }
    await dbRun('DELETE FROM users WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[admin/users DELETE]', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// POST /api/admin/users/:id/clients
router.post('/users/:id/clients', adminOnly, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { client_ids } = req.body ?? {};
    await dbRun('DELETE FROM user_clients WHERE user_id = ?', [userId]);
    for (const cid of (client_ids ?? [])) {
      await dbRun(
        'INSERT OR IGNORE INTO user_clients (user_id, client_id) VALUES (?, ?)',
        [userId, Number(cid)]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[admin/users/clients POST]', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ═══════════════════════════════════════════════════════════
// CLIENTS
// ═══════════════════════════════════════════════════════════

router.get('/clients', adminOnly, async (req, res) => {
  try {
    const clients = await dbAll('SELECT * FROM clients ORDER BY id');
    res.json({ clients });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.post('/clients', adminOnly, async (req, res) => {
  try {
    const { name, address, city, contact_name, contact_email, contact_phone } = req.body ?? {};
    if (!name) return res.status(400).json({ message: 'Le champ name est requis.' });
    const { lastID } = await dbRun(
      `INSERT INTO clients (organization_id, name, address, city, contact_name, contact_email, contact_phone)
       VALUES (1, ?, ?, ?, ?, ?, ?)`,
      [name, address ?? null, city ?? null, contact_name ?? null, contact_email ?? null, contact_phone ?? null]
    );
    const client = await dbGet('SELECT * FROM clients WHERE id = ?', [lastID]);
    res.status(201).json({ client });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.put('/clients/:id', adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const fields = ['name', 'address', 'city', 'contact_name', 'contact_email', 'contact_phone'];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        await dbRun(`UPDATE clients SET ${f} = ? WHERE id = ?`, [req.body[f], id]);
      }
    }
    const client = await dbGet('SELECT * FROM clients WHERE id = ?', [id]);
    res.json({ client });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ═══════════════════════════════════════════════════════════
// SITES
// ═══════════════════════════════════════════════════════════

router.get('/sites', adminOnly, async (req, res) => {
  try {
    const sites = await dbAll(
      `SELECT s.*, c.name AS client_name, pp.name AS profile_name
       FROM sites s
       LEFT JOIN clients c ON c.id = s.client_id
       LEFT JOIN panel_profiles pp ON pp.id = s.panel_profile_id
       ORDER BY s.id`
    );
    res.json({ sites });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.post('/sites', adminOnly, async (req, res) => {
  try {
    const { name, client_id, address, city, ssi_category, visit_cadence_days, contract_reference, panel_profile_id } = req.body ?? {};
    if (!name) return res.status(400).json({ message: 'Le champ name est requis.' });
    const qr_uuid = crypto.randomUUID();
    const { lastID } = await dbRun(
      `INSERT INTO sites
         (organization_id, client_id, panel_profile_id, name, address, city, qr_uuid,
          ssi_category, visit_cadence_days, contract_reference)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [client_id ?? null, panel_profile_id ?? null, name, address ?? null, city ?? null,
       qr_uuid, ssi_category ?? null, visit_cadence_days ?? 180, contract_reference ?? null]
    );
    const site = await dbGet('SELECT * FROM sites WHERE id = ?', [lastID]);
    res.status(201).json({ site });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ═══════════════════════════════════════════════════════════
// TRB DEVICES
// ═══════════════════════════════════════════════════════════

router.get('/trb-devices', adminOnly, async (req, res) => {
  try {
    const devices = await dbAll(
      `SELECT t.*, c.name AS client_name, s.name AS site_name
       FROM trb_devices t
       LEFT JOIN clients c ON c.id = t.client_id
       LEFT JOIN sites   s ON s.id = t.site_id
       ORDER BY t.id`
    );
    res.json({ devices });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.put('/trb-devices/:id/assign', adminOnly, async (req, res) => {
  try {
    const { client_id, site_id } = req.body ?? {};
    const id = Number(req.params.id);
    await dbTransaction(async () => {
      await dbRun(
        `UPDATE trb_devices SET client_id = ?, site_id = ?, status = 'claimed' WHERE id = ?`,
        [client_id, site_id, id]
      );
      await dbRun(
        `INSERT INTO trb_device_assignments
           (trb_device_id, action, client_id, site_id, performed_by, performed_at)
         VALUES (?, 'claimed', ?, ?, ?, strftime('%s','now'))`,
        [id, client_id, site_id, req.user.id]
      );
    });
    const device = await dbGet('SELECT * FROM trb_devices WHERE id = ?', [id]);
    res.json({ device });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.put('/trb-devices/:id/decommission', adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await dbTransaction(async () => {
      await dbRun(`UPDATE trb_devices SET status = 'decommissioned' WHERE id = ?`, [id]);
      await dbRun(
        `INSERT INTO trb_device_assignments (trb_device_id, action, performed_by, performed_at)
         VALUES (?, 'decommissioned', ?, strftime('%s','now'))`,
        [id, req.user.id]
      );
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ═══════════════════════════════════════════════════════════
// PANEL PROFILES
// ═══════════════════════════════════════════════════════════

router.get('/panel-profiles', adminOnly, async (req, res) => {
  try {
    const profiles = await dbAll('SELECT * FROM panel_profiles ORDER BY id');
    res.json({ profiles });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.get('/panel-profiles/:id', adminOnly, async (req, res) => {
  try {
    const profile = await dbGet('SELECT * FROM panel_profiles WHERE id = ?', [Number(req.params.id)]);
    if (!profile) return res.status(404).json({ message: 'Profil introuvable.' });
    res.json({ profile });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.put('/panel-profiles/:id', adminOnly, async (req, res) => {
  try {
    const { name, description, brand, model, encoding, rules_json } = req.body ?? {};
    const id = Number(req.params.id);
    await dbRun(
      `UPDATE panel_profiles
       SET name = ?, description = ?, brand = ?, model = ?,
           encoding = ?, rules_json = ?, updated_at = strftime('%s','now')
       WHERE id = ?`,
      [name, description ?? null, brand ?? null, model ?? null,
       encoding ?? 'utf-8', rules_json ?? '{}', id]
    );
    const profile = await dbGet('SELECT * FROM panel_profiles WHERE id = ?', [id]);
    res.json({ profile });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

export default router;