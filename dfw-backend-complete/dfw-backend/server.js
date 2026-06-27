// server.js — DigiFireWatch local backend
// Mirrors production server at 192.168.40.54:10453
// Local port: 3000

import 'dotenv/config';
import express    from 'express';
import cors       from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { verifyToken } from './src/auth.js';
import { runMigrations } from './src/db.js';

// ── Route modules
import authRoutes      from './src/routes/auth.js';
import adminRoutes     from './src/routes/admin.js';
import dashboardRoutes from './src/routes/dashboard.js';
import eventsRoutes    from './src/routes/events.js';
import sitesRoutes     from './src/routes/sites.js';
import gatewaysRoutes  from './src/routes/gateways.js';
import meRoutes        from './src/routes/me.js';

const app  = express();
const PORT = process.env.PORT ?? 3000;

// ── CORS — allow Angular dev server (localhost:4200)
app.use(cors({
  origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '5mb' }));

// ── Health check (no auth)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0-local',
    timestamp: Math.floor(Date.now() / 1000),
  });
});

// ── Routes
app.use('/api/auth',      authRoutes);
app.use('/api/admin',     adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/events',    eventsRoutes);
app.use('/api/sites',     sitesRoutes);
app.use('/api/gateways',  gatewaysRoutes);
app.use('/api/me',        meRoutes);

// ── 404 fallback for unknown API routes
app.use('/api/*', (_req, res) => {
  res.status(404).json({ message: 'Route non trouvée.' });
});

// ── WebSocket server (mirrors production /ws endpoint)
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

// Track connected clients
const wsClients = new Set();

wss.on('connection', (ws, req) => {
  // Verify JWT from ?token= query param (mirrors production)
  const url    = new URL(req.url, `http://localhost`);
  const token  = url.searchParams.get('token');

  let user = null;
  try {
    user = verifyToken(token);
  } catch {
    ws.close(4001, 'Unauthorized');
    return;
  }

  ws.userId = user.id;
  ws.userRole = user.role;
  wsClients.add(ws);

  console.log(`[ws] Client connecté: user ${user.id} (${user.role})`);

  ws.on('close', () => {
    wsClients.delete(ws);
    console.log(`[ws] Client déconnecté: user ${user.id}`);
  });

  ws.on('error', console.error);

  // Send welcome ping
  ws.send(JSON.stringify({ type: 'connected', message: 'DigiFireWatch local backend' }));
});

// Broadcast helper — used when new events arrive (from MQTT in production)
export function broadcastEvent(event) {
  const msg = JSON.stringify({ type: 'new_event', event });
  for (const ws of wsClients) {
    if (ws.readyState === 1) ws.send(msg);   // 1 = OPEN
  }
}

// ── Start
async function start() {
  await runMigrations();

  httpServer.listen(PORT, () => {
    console.log('');
    console.log('🔥 DigiFireWatch Local Backend');
    console.log(`   API    → http://localhost:${PORT}/api`);
    console.log(`   Health → http://localhost:${PORT}/api/health`);
    console.log(`   WS     → ws://localhost:${PORT}/ws`);
    console.log('');
    console.log('   Run seed: node scripts/seed.js');
    console.log('');
  });
}

start().catch(err => {
  console.error('❌ Startup failed:', err);
  process.exit(1);
});
