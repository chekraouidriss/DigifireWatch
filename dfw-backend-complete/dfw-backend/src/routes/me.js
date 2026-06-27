// src/routes/me.js
// GET /api/me/clients — returns the list of clients this user can access
// Used by Angular's client picker dropdown (mirrors production L.1 slice)

import { Router } from 'express';
import { dbAll }  from '../db.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.get('/clients', authenticate, async (req, res) => {
  try {
    let clients;
    if (req.user.role === 'admin') {
      clients = await dbAll('SELECT id, name, city FROM clients ORDER BY id');
    } else {
      clients = await dbAll(
        `SELECT c.id, c.name, c.city
         FROM clients c
         JOIN user_clients uc ON uc.client_id = c.id
         WHERE uc.user_id = ?
         ORDER BY c.id`,
        [req.user.id]
      );
    }
    res.json({ clients });
  } catch (err) {
    console.error('[me/clients]', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

export default router;
