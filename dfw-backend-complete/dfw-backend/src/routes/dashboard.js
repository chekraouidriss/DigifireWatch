// src/routes/dashboard.js
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

    // Fallback si aucun client n'est assigné pour éviter le crash SQL
    if (scopedClientIds.length === 0) {
      return res.json({ 
        stats: { total: 0, fire: 0, fault: 0, restore: 0, online_gateways: 0 }, 
        recent_events: [], 
        panels: [] 
      });
    }

    const placeholders = scopedClientIds.map(() => '?').join(',');

    // 1. Calcul des KPI globaux depuis la table unifiée `all_gateways_events`
    const stats = await dbGet(
      `SELECT
         COUNT(*)                                          AS total,
         SUM(CASE WHEN type='FIRE'  THEN 1 ELSE 0 END)   AS fire,
         SUM(CASE WHEN type='FAULT' THEN 1 ELSE 0 END)   AS fault,
         SUM(CASE WHEN type='RESTORE' THEN 1 ELSE 0 END) AS restore
       FROM all_gateways_events
       WHERE (client_id IN (${placeholders}) OR client_id IS NULL) AND hidden_at IS NULL`,
      scopedClientIds
    );

    // 2. Calcul du nombre de modems TRB actifs en ligne
    const onlineGw = await dbGet(
      `SELECT COUNT(*) AS cnt FROM trb_devices t
       LEFT JOIN ecs_panels p ON p.trb_imei = t.imei
       WHERE (p.client_id IN (${placeholders}) OR p.client_id IS NULL) AND t.online_status = 'ONLINE'`,
      scopedClientIds
    );

    // 3. Extraction des 20 derniers événements télémétriques
    const recentEvents = await dbAll(
      `SELECT e.*, c.company_name AS client_name, p.panel_name
       FROM all_gateways_events e
       LEFT JOIN clients c ON c.id = e.client_id
       LEFT JOIN ecs_panels p ON p.id = e.ecs_panel_id
       WHERE (e.client_id IN (${placeholders}) OR e.client_id IS NULL) AND e.hidden_at IS NULL
       ORDER BY e.ts DESC LIMIT 20`,
      scopedClientIds
    );

    // 4. Liste de supervision des Centrales ECS (SSI) exigée par le Front-end
    const panels = await dbAll(
      `SELECT p.id, p.panel_name, p.panel_model, p.trb_imei, c.company_name, t.online_status AS gw_status
       FROM ecs_panels p
       LEFT JOIN clients c ON c.id = p.client_id
       LEFT JOIN trb_devices t ON t.imei = p.trb_imei
       WHERE p.client_id IN (${placeholders})
       ORDER BY p.id`,
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
      panels: panels, // Envoi propre de la structure attendue par l'UI
    });

  } catch (err) {
    console.error('[dashboard fatal crash patch]', err);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
});

export default router;