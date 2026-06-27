// src/middleware/authenticate.js
// Attaches req.user on every protected route.
// Identical behaviour to production: reads Bearer token, verifies, populates req.user.

import { verifyToken } from '../auth.js';

export function authenticate(req, res, next) {
  const header = req.headers['authorization'] ?? '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Token manquant.' });
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ message: 'Token invalide ou expiré.' });
  }
}

// ── Role guard middleware factory
// Usage: router.get('/admin/x', authenticate, requireRole('admin'), handler)
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès refusé.' });
    }
    next();
  };
}
