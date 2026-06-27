// src/routes/gateways.js
import { Router } from 'express';
import { dbAll }  from '../db.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    let devices;
    if (req.user.role === 'admin') {
      devices = await dbAll(
        `SELECT t.*, c.name AS client_name, s.name AS site_name
         FROM trb_devices t
         LEFT JOIN clients c ON c.id = t.client_id
         LEFT JOIN sites s ON s.id = t.site_id
         ORDER BY t.id`
      );
    } else {
      const rows = await dbAll('SELECT client_id FROM user_clients WHERE user_id = ?', [req.user.id]);
      const ids  = rows.map(r => r.client_id);
      if (!ids.length) return res.json({ devices: [] });
      const ph = ids.map(() => '?').join(',');
      devices = await dbAll(
        `SELECT t.*, c.name AS client_name, s.name AS site_name
         FROM trb_devices t
         LEFT JOIN clients c ON c.id = t.client_id
         LEFT JOIN sites s ON s.id = t.site_id
         WHERE t.client_id IN (${ph})
         ORDER BY t.id`,
        ids
      );
    }
    res.json({ devices });
  } catch (err) {
    console.error('[gateways GET]', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

export default router;
