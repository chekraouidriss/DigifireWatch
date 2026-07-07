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
        `SELECT t.*, c.company_name, p.panel_name
         FROM trb_devices t
         LEFT JOIN ecs_panels p ON p.trb_imei = t.imei
         LEFT JOIN clients c ON c.id = p.client_id
         ORDER BY t.id`
      );
    } else {
      const rows = await dbAll('SELECT client_id FROM user_clients WHERE user_id = ?', [req.user.id]);
      const ids  = rows.map(r => r.client_id);
      if (!ids.length) return res.json({ devices: [] });
      const ph = ids.map(() => '?').join(',');
      devices = await dbAll(
        `SELECT t.*, c.company_name, p.panel_name
         FROM trb_devices t
         LEFT JOIN ecs_panels p ON p.trb_imei = t.imei
         LEFT JOIN clients c ON c.id = p.client_id
         WHERE p.client_id IN (${ph}) OR p.client_id IS NULL
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