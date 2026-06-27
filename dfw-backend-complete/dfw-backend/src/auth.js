// src/auth.js
// JWT generation + bcrypt helpers
// Mirrors production: 8-hour JWT, bcrypt round 12, same payload shape

import jwt      from 'jsonwebtoken';
import bcrypt   from 'bcrypt';

const JWT_SECRET  = process.env.JWT_SECRET ?? 'changeme';
const JWT_EXPIRES = '8h';       // matches production
const BCRYPT_ROUNDS = 12;

// ── Token helpers
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);   // throws on invalid/expired
}

// ── Password helpers
export function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// ── Build the user payload that goes into the JWT and the API response
// Shape must be identical to production so Angular AuthService parses it correctly
export function buildUserPayload(user) {
  return {
    id:              user.id,
    username:        user.username,
    role:            user.role,
    name:            user.name ?? user.username,
    organization_id: user.organization_id ?? 1,
  };
}
