// src/routes/admin.js
import { Router } from 'express';
import crypto from 'crypto';
import { dbAll, dbGet, dbRun, dbTransaction } from '../db.js';
import { hashPassword, buildUserPayload } from '../auth.js'; // <-- Importation indispensable pour le hashage et payload
import { authenticate, requireRole } from '../middleware/authenticate.js';

const router = Router();
const adminOnly = [authenticate, requireRole('admin')];

// ═══════════════════════════════════════════════════════════
// CLIENTS MANAGEMENT (Maison Mère + Mandatory 3 Contact Layout)
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
    const { 
      company_name, hq_address, city,
      dir_securite_name, dir_securite_phone, dir_securite_email,
      dir_technique_name, dir_technique_phone, dir_technique_email,
      adj_technique_name, adj_technique_phone, adj_technique_email
    } = req.body ?? {};

    if (!company_name || !dir_securite_name || !dir_technique_name || !adj_technique_name) {
      return res.status(400).json({ message: 'La raison sociale (company_name) et les noms des 3 contacts obligatoires sont requis.' });
    }

    const { lastID } = await dbRun(
      `INSERT INTO clients (
        company_name, hq_address, city,
        dir_securite_name, dir_securite_phone, dir_securite_email,
        dir_technique_name, dir_technique_phone, dir_technique_email,
        adj_technique_name, adj_technique_phone, adj_technique_email
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        company_name, hq_address ?? null, city ?? null,
        dir_securite_name, dir_securite_phone ?? '', dir_securite_email ?? '',
        dir_technique_name, dir_technique_phone ?? '', dir_technique_email ?? '',
        adj_technique_name, adj_technique_phone ?? '', adj_technique_email ?? ''
      ]
    );

    const client = await dbGet('SELECT * FROM clients WHERE id = ?', [lastID]);
    res.status(201).json({ client });
  } catch (err) {
    console.error('[Admin Clients POST Error]', err);
    res.status(500).json({ message: 'Erreur serveur lors de la création du client.' });
  }
});

router.put('/clients/:id', adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const fields = [
      'company_name', 'hq_address', 'city',
      'dir_securite_name', 'dir_securite_phone', 'dir_securite_email',
      'dir_technique_name', 'dir_technique_phone', 'dir_technique_email',
      'adj_technique_name', 'adj_technique_phone', 'adj_technique_email'
    ];
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

router.delete('/clients/:id', adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const linkedPanel = await dbGet('SELECT id FROM ecs_panels WHERE client_id = ? LIMIT 1', [id]);
    if (linkedPanel) {
      return res.status(400).json({ message: 'Impossible de supprimer ce client car il possède des centrales ECS actives.' });
    }
    await dbRun('DELETE FROM user_clients WHERE client_id = ?', [id]);
    await dbRun('DELETE FROM clients WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ═══════════════════════════════════════════════════════════
// ECS / SSI PANELS MANAGEMENT & TRB HOT-SWAPPING CONTROL
// ═══════════════════════════════════════════════════════════

router.get('/ecs-panels', adminOnly, async (req, res) => {
  try {
    const { client_id } = req.query;
    let sql = `SELECT p.*, c.company_name, t.online_status AS gw_status 
               FROM ecs_panels p
               LEFT JOIN clients c ON c.id = p.client_id
               LEFT JOIN trb_devices t ON t.imei = p.trb_imei`;
    let params = [];
    if (client_id) {
      sql += ' WHERE p.client_id = ?';
      params.push(Number(client_id));
    }
    sql += ' ORDER BY p.id';
    const panels = await dbAll(sql, params);
    res.json({ panels });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.post('/ecs-panels', adminOnly, async (req, res) => {
  try {
    const { 
      client_id, panel_name, panel_model, ref_broudi, 
      niveau_securite, lignes_detection, resume_installation, location_details 
    } = req.body ?? {};

    if (!client_id || !panel_name || !panel_model || !location_details) {
      return res.status(400).json({ message: 'Client ID, Nom du panneau, Modèle et Localisation précise requis.' });
    }

    const { lastID } = await dbRun(
      `INSERT INTO ecs_panels (
        client_id, panel_name, panel_model, ref_broudi, 
        niveau_securite, lignes_detection, resume_installation, location_details
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [client_id, panel_name, panel_model, ref_broudi ?? null, 
       niveau_securite ?? null, lignes_detection ?? null, resume_installation ?? null, location_details]
    );

    const panel = await dbGet('SELECT * FROM ecs_panels WHERE id = ?', [lastID]);
    res.status(201).json({ panel });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.put('/ecs-panels/:id/assign-trb', adminOnly, async (req, res) => {
  try {
    const panelId = Number(req.params.id);
    const { trb_imei } = req.body ?? {};

    if (!trb_imei) {
      return res.status(400).json({ message: "L'IMEI du modem TRB est requis pour l'affectation." });
    }

    await dbTransaction(async () => {
      await dbRun(`UPDATE ecs_panels SET trb_imei = NULL WHERE trb_imei = ?`, [trb_imei]);
      await dbRun(`UPDATE ecs_panels SET trb_imei = ? WHERE id = ?`, [trb_imei, panelId]);
      await dbRun(`UPDATE trb_devices SET status = 'claimed' WHERE imei = ?`, [trb_imei]);
    });

    const updatedPanel = await dbGet('SELECT * FROM ecs_panels WHERE id = ?', [panelId]);
    res.json({ success: true, panel: updatedPanel });
  } catch (err) {
    console.error('[TRB Hot-Swap Execution Failed]', err);
    res.status(500).json({ message: "Erreur lors du Hot-Swapping de la TRB.", details: err.message });
  }
});

router.put('/ecs-panels/:id/remove-trb', adminOnly, async (req, res) => {
  try {
    const panelId = Number(req.params.id);
    const panel = await dbGet('SELECT trb_imei FROM ecs_panels WHERE id = ?', [panelId]);
    
    if (panel && panel.trb_imei) {
      await dbTransaction(async () => {
        await dbRun(`UPDATE trb_devices SET status = 'discovered' WHERE imei = ?`, [panel.trb_imei]);
        await dbRun(`UPDATE ecs_panels SET trb_imei = NULL WHERE id = ?`, [panelId]);
      });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.delete('/ecs-panels/:id', adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await dbRun('DELETE FROM ecs_panels WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ═══════════════════════════════════════════════════════════
// GENERAL GATEWAYS INVENTORY
// ═══════════════════════════════════════════════════════════

router.get('/trb-devices', adminOnly, async (req, res) => {
  try {
    const devices = await dbAll(
      `SELECT t.*, p.panel_name, c.company_name
       FROM trb_devices t
       LEFT JOIN ecs_panels p ON p.trb_imei = t.imei
       LEFT JOIN clients c ON c.id = p.client_id
       ORDER BY t.id`
    );
    res.json({ devices });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ═══════════════════════════════════════════════════════════
// USERS — MANAGEMENT & NOURISHED INGRESS ENDPOINT
// ═══════════════════════════════════════════════════════════

router.get('/users', adminOnly, async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT u.id, u.username, u.role, u.name, u.email, u.ssi_access_level, u.created_at, GROUP_CONCAT(uc.client_id) AS client_ids
       FROM users u
       LEFT JOIN user_clients uc ON uc.user_id = u.id
       GROUP BY u.id ORDER BY u.id`
    );
    const users = rows.map(u => ({
      ...u,
      client_ids: u.client_ids ? u.client_ids.split(',').map(Number) : [],
    }));
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// 🚀 NOUVELLE ROUTE CRUCIALE : POST /api/admin/users
// Remplacer uniquement la route POST /users dans src/routes/admin.js pour remonter la vraie erreur

router.post('/users', adminOnly, async (req, res) => {
  try {
    const {
      username, password, name, role, email, ssi_access_level, client_ids
    } = req.body ?? {};

    if (!username || !password || !role) {
      return res.status(400).json({ message: 'Les champs username, password et role sont requis.' });
    }

    const VALID_ROLES = ['admin', 'technician', 'client'];
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Rôle d\'accès invalide.' });
    }

    const checkUsername = username.trim().toLowerCase();
    
    // Vérification de sécurité insensible à la casse
    const existing = await dbGet('SELECT id FROM users WHERE LOWER(username) = ?', [checkUsername]);
    if (existing) {
      return res.status(409).json({ message: 'Cet identifiant de connexion est déjà utilisé.' });
    }

    const password_hash = await hashPassword(password);

    const result = await dbRun(
      `INSERT INTO users (
        organization_id, username, password_hash, name, role, email, ssi_access_level, created_at
       ) VALUES (1, ?, ?, ?, ?, ?, ?, strftime('%s','now'))`,
      [checkUsername, password_hash, name?.trim() || username, role, email?.trim() || null, ssi_access_level || null]
    );

    if (role !== 'admin' && Array.isArray(client_ids) && client_ids.length > 0) {
      for (const cid of client_ids) {
        await dbRun('INSERT OR IGNORE INTO user_clients (user_id, client_id) VALUES (?, ?)', [result.lastID, Number(cid)]);
      }
    }

    const created = await dbGet('SELECT * FROM users WHERE id = ?', [result.lastID]);
    
    // Fallback de sécurité au cas où buildUserPayload renvoie un format strict
    let payload;
    try {
      payload = buildUserPayload(created);
    } catch (authErr) {
      payload = { id: created.id, username: created.username, role: created.role, name: created.name };
    }

    return res.status(201).json(payload);
  } catch (err) {
    console.error('[Admin Users POST Error]', err);
    // REMONTER LE VRAI MESSAGE DE CATCH AU FRONT-END POUR L'EXPERTISE
    return res.status(500).json({ message: `Erreur SQL/Serveur : ${err.message}` });
  }
});
// 🚀 NOUVELLE ROUTE CRUCIALE : PUT /api/admin/users/:id
router.put('/users/:id', adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, email, password, client_ids } = req.body ?? {};

    // 1. Mise à jour des informations de base si elles sont fournies
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ message: 'Mot de passe trop court (minimum 8 caractères).' });
      }
      const hash = await hashPassword(password);
      await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
    }
    
    if (name !== undefined) {
      await dbRun('UPDATE users SET name = ? WHERE id = ?', [name.trim(), id]);
    }
    
    if (email !== undefined) {
      await dbRun('UPDATE users SET email = ? WHERE id = ?', [email.trim() || null, id]);
    }

    // 2. ⚡ Réassignation dynamique et atomique des permissions de clients (Maison Mère)
    if (client_ids !== undefined) {
      await dbTransaction(async () => {
        // Purger les anciennes assignations d'accès pour ce technicien/client konkrét
        await dbRun('DELETE FROM user_clients WHERE user_id = ?', [id]);
        
        // Ré-injecter le nouveau périmètre de sécurité choisi par l'Admin
        if (Array.isArray(client_ids) && client_ids.length > 0) {
          for (const cid of client_ids) {
            await dbRun(
              'INSERT OR IGNORE INTO user_clients (user_id, client_id) VALUES (?, ?)',
              [id, Number(cid)]
            );
          }
        }
      });
    }

    // 3. Récupérer le profil mis à jour pour le renvoyer proprement au Front-end
    const updatedUser = await dbGet('SELECT * FROM users WHERE id = ?', [id]);
    if (!updatedUser) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    return res.json({ 
      success: true, 
      user: buildUserPayload(updatedUser) 
    });

  } catch (err) {
    console.error('[Admin Users PUT Fatal Error]', err);
    return res.status(500).json({ 
      message: `Erreur interne du serveur lors de la mise à jour : ${err.message}` 
    });
  }
});
// 🔍 ROUTE AMÉLIORÉE : GET /api/admin/users avec Recherche Backend Intégrée
router.get('/users', adminOnly, async (req, res) => {
  try {
    const { search } = req.query;
    
    let query = `
      SELECT 
        u.id, 
        u.username, 
        u.role, 
        u.name, 
        u.email, 
        u.ssi_access_level, 
        u.created_at,
        GROUP_CONCAT(uc.client_id) AS client_ids_str
      FROM users u
      LEFT JOIN user_clients uc ON uc.user_id = u.id
    `;
    
    const params = [];
    
    // Si un terme de recherche est fourni côté Backend
    if (search) {
      const searchWildcard = `%${search.trim().toLowerCase()}%`;
      query += `
        WHERE LOWER(u.username) LIKE ? 
           OR LOWER(COALESCE(u.name, '')) LIKE ? 
           OR LOWER(COALESCE(u.email, '')) LIKE ?
           OR LOWER(u.role) LIKE ?
      `;
      params.push(searchWildcard, searchWildcard, searchWildcard, searchWildcard);
    }
    
    query += ` GROUP BY u.id ORDER BY u.created_at DESC`;
    
    const rows = await dbAll(query, params);
    
    // Formater le résultat pour renvoyer un vrai tableau d'entiers pour client_ids
    const formattedUsers = rows.map(user => {
      return {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        email: user.email,
        ssi_access_level: user.ssi_access_level,
        created_at: user.created_at,
        client_ids: user.client_ids_str 
          ? user.client_ids_str.split(',').map(Number) 
          : []
      };
    });
    
    return res.json({ success: true, users: formattedUsers });
    
  } catch (err) {
    console.error('[Admin Users GET Search Error]', err);
    return res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs.' });
  }
});
// 🗑️ DELETE /api/admin/users/:id
router.delete('/users/:id', adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await dbRun('DELETE FROM users WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

export default router;