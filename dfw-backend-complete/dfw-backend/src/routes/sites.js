// src/routes/sites.js
import { Router } from 'express';
import { dbAll } from '../db.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    let sql, params;
    const { client_id } = req.query;

    if (req.user.role === 'admin') {
      sql    = `SELECT s.*, c.name AS client_name, t.online_status AS gw_status, t.trb_id
                FROM sites s
                LEFT JOIN clients c ON c.id = s.client_id
                LEFT JOIN trb_devices t ON t.site_id = s.id AND t.status = 'claimed'
                ORDER BY s.id`;
      params = [];
    } else {
      const rows = await dbAll('SELECT client_id FROM user_clients WHERE user_id = ?', [req.user.id]);
      const ids  = rows.map(r => r.client_id);
      if (!ids.length) return res.json({ sites: [] });
      const ph = ids.map(() => '?').join(',');
      sql    = `SELECT s.*, c.name AS client_name, t.online_status AS gw_status, t.trb_id
                FROM sites s
                LEFT JOIN clients c ON c.id = s.client_id
                LEFT JOIN trb_devices t ON t.site_id = s.id AND t.status = 'claimed'
                WHERE s.client_id IN (${ph}) ORDER BY s.id`;
      params = ids;
    }

    if (client_id) {
      sql    = sql.replace('ORDER BY', `AND s.client_id = ${Number(client_id)} ORDER BY`);
    }

    const sites = await dbAll(sql, params);
    res.json({ sites });
  } catch (err) {
    console.error('[sites GET]', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

export default router;
