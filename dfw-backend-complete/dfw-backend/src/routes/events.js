// src/routes/events.js
import { Router } from 'express';
import { dbAll, dbGet, dbRun } from '../db.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

async function getAllowedClientIds(user) {
  if (user.role === 'admin') {
    const rows = await dbAll('SELECT id FROM clients');
    return rows.map(r => r.id);
  }
  const rows = await dbAll('SELECT client_id FROM user_clients WHERE user_id = ?', [user.id]);
  return rows.map(r => r.client_id);
}

// GET /api/events
router.get('/', authenticate, async (req, res) => {
  try {
    const allowed = await getAllowedClientIds(req.user);
    if (!allowed.length) return res.json({ events: [] });

    const { type, site_id, limit = 50, client_id } = req.query;
    let ids = allowed;
    if (client_id) {
      const cid = Number(client_id);
      if (!allowed.includes(cid)) return res.status(403).json({ message: 'Accès refusé.' });
      ids = [cid];
    }

    const ph = ids.map(() => '?').join(',');
    let sql = `SELECT e.*, s.name AS site_name FROM events e
               LEFT JOIN sites s ON s.id = e.site_id
               WHERE e.client_id IN (${ph}) AND e.hidden_at IS NULL`;
    const params = [...ids];

    if (type)    { sql += ' AND e.type = ?';    params.push(type); }
    if (site_id) { sql += ' AND e.site_id = ?'; params.push(Number(site_id)); }
    sql += ` ORDER BY e.ts DESC LIMIT ?`;
    params.push(Number(limit));

    const events = await dbAll(sql, params);
    res.json({ events });
  } catch (err) {
    console.error('[events GET]', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// GET /api/events/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const allowed = await getAllowedClientIds(req.user);
    const ph = allowed.map(() => '?').join(',');
    const event = await dbGet(
      `SELECT e.*, s.name AS site_name FROM events e
       LEFT JOIN sites s ON s.id = e.site_id
       WHERE e.id = ? AND e.client_id IN (${ph})`,
      [Number(req.params.id), ...allowed]
    );
    if (!event) return res.status(404).json({ message: 'Événement introuvable.' });
    res.json({ event });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// DELETE /api/events/:id (soft delete)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await dbRun(
      `UPDATE events SET hidden_at = strftime('%s','now'), hidden_by = ?, hidden_reason = 'deleted'
       WHERE id = ?`,
      [req.user.id, Number(req.params.id)]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

export default router;
