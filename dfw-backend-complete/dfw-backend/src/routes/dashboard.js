// src/routes/dashboard.js
// GET /api/dashboard — stats + recent events scoped to the requesting user's clients
// Mirrors production L.2.a slice

import { Router } from 'express';
import { dbAll, dbGet } from '../db.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// Helper: resolve which client_ids this user can see
async function getUserClientIds(user) {
  if (user.role === 'admin') {
    const rows = await dbAll('SELECT id FROM clients', []);
    return rows.map(r => r.id);
  }
  const rows = await dbAll('SELECT client_id FROM user_clients WHERE user_id = ?', [user.id]);
  return rows.map(r => r.client_id);
}

router.get('/', authenticate, async (req, res) => {
  try {
    const { client_id } = req.query;
    const allowed = await getUserClientIds(req.user);

    let scopedClientIds = allowed;
    if (client_id) {
      const cid = Number(client_id);
      if (!allowed.includes(cid)) {
        return res.status(403).json({ message: 'Accès refusé à ce client.' });
      }
      scopedClientIds = [cid];
    }

    if (scopedClientIds.length === 0) {
      return res.json({ stats: { total: 0, fire: 0, fault: 0, online_gateways: 0 }, recent_events: [], sites: [] });
    }

    const placeholders = scopedClientIds.map(() => '?').join(',');

    const stats = await dbGet(
      `SELECT
         COUNT(*)                                          AS total,
         SUM(CASE WHEN type='FIRE'  THEN 1 ELSE 0 END)   AS fire,
         SUM(CASE WHEN type='FAULT' THEN 1 ELSE 0 END)   AS fault,
         SUM(CASE WHEN type='RESTORE' THEN 1 ELSE 0 END) AS restore
       FROM events
       WHERE client_id IN (${placeholders}) AND hidden_at IS NULL`,
      scopedClientIds
    );

    const onlineGw = await dbGet(
      `SELECT COUNT(*) AS cnt FROM trb_devices
       WHERE client_id IN (${placeholders}) AND online_status = 'ONLINE'`,
      scopedClientIds
    );

    const recentEvents = await dbAll(
      `SELECT e.*, s.name AS site_name
       FROM events e
       LEFT JOIN sites s ON s.id = e.site_id
       WHERE e.client_id IN (${placeholders}) AND e.hidden_at IS NULL
       ORDER BY e.ts DESC LIMIT 20`,
      scopedClientIds
    );

    const sites = await dbAll(
      `SELECT s.*, t.online_status AS gw_status, t.trb_id
       FROM sites s
       LEFT JOIN trb_devices t ON t.site_id = s.id AND t.status = 'claimed'
       WHERE s.client_id IN (${placeholders})
       ORDER BY s.id`,
      scopedClientIds
    );

    res.json({
      stats: {
        total:           stats?.total ?? 0,
        fire:            stats?.fire ?? 0,
        fault:           stats?.fault ?? 0,
        restore:         stats?.restore ?? 0,
        online_gateways: onlineGw?.cnt ?? 0,
      },
      recent_events: recentEvents,
      sites,
    });

  } catch (err) {
    console.error('[dashboard]', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

export default router;
