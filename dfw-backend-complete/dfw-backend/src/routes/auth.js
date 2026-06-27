// src/routes/auth.js
//
// PUBLIC endpoints — no authentication required:
//   POST /api/auth/login  → { token, user }
//   GET  /api/auth/me     → { user }          (token required — rehydrate session)
//
// REMOVED: POST /api/auth/signup
//   Account creation has been moved to POST /api/admin/users (admin-only).
//   Any stale client hitting /api/auth/signup receives 410 Gone so the error
//   is immediately obvious during development.

import { Router } from 'express';
import { dbGet, dbAll } from '../db.js'; // Utilise les utilitaires d'accès à sqlite3
import {
  comparePassword,
  signToken,
  buildUserPayload,
} from '../auth.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// ─────────────────────────────────────────────────────────
// POST /api/auth/login
// Body : { username: string, password: string }
// Returns : { token: string, user: UserPayload }
// ─────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body ?? {};

    if (!username || !password) {
      return res.status(400).json({ message: 'Identifiant et mot de passe requis.' });
    }

    const user = await dbGet(
      'SELECT * FROM users WHERE username = ?',
      [username.trim().toLowerCase()]
    );

    if (!user) {
      // Message générique pour éviter l'énumération des comptes existants
      return res.status(401).json({ message: 'Identifiant ou mot de passe incorrect.' });
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Identifiant ou mot de passe incorrect.' });
    }

    const payload = buildUserPayload(user);
    const token   = signToken(payload);

    // Multi-client scoping: récupération des clients assignés
    const clientRows = await dbAll(
      'SELECT client_id FROM user_clients WHERE user_id = ?',
      [user.id]
    );

    return res.json({
      token,
      user: { ...payload, client_ids: clientRows.map(r => r.client_id) },
    });

  } catch (err) {
    console.error('[auth/login]', err);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/auth/me
// Header : Authorization: Bearer <token>
// Returns : { user: UserPayload }
// Utilise pour recharger la session Angular sans déconnexion
// ─────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });

    const clientRows = await dbAll(
      'SELECT client_id FROM user_clients WHERE user_id = ?',
      [user.id]
    );

    return res.json({
      user: {
        ...buildUserPayload(user),
        client_ids: clientRows.map(r => r.client_id),
      },
    });
  } catch (err) {
    console.error('[auth/me]', err);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/auth/signup  — SUPPRIMÉ DÉFINITIVEMENT
// Renvoie un code 410 (Gone) pour couper l'accès public immédiat.
// ─────────────────────────────────────────────────────────
router.post('/signup', (_req, res) => {
  return res.status(410).json({
    message:
      'Cette route a été supprimée. ' +
      'La création de comptes est réservée aux administrateurs : ' +
      'POST /api/admin/users',
  });
});

export default router;