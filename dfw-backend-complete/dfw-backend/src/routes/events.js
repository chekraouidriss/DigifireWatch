// src/routes/events.js
import { Router } from 'express';
import { dbAll, dbGet, dbRun } from '../db.js';
import { authenticate } from '../middleware/authenticate.js';
import { broadcastEvent } from '../../server.js';

const router = Router();

async function getAllowedClientIds(user) {
  if (user.role === 'admin') {
    const rows = await dbAll('SELECT id FROM clients');
    return rows.map(r => r.id);
  }
  const rows = await dbAll('SELECT client_id FROM user_clients WHERE user_id = ?', [user.id]);
  return rows.map(r => r.client_id);
}

// 1. Ingestion des événements du panneau d'alarme (Batch Ingress Engine)
router.post('/printer/:gateway_id/data', async (req, res) => {
  try {
    const { gateway_id } = req.params; 
    const batch = req.body;            

    if (!Array.isArray(batch)) {
      return res.status(400).json({ error: 'Format invalide. Un tableau JSON est attendu.' });
    }

    const imeiMatch = gateway_id.match(/trb142-([0-9]{15})/);
    if (!imeiMatch) {
      return res.status(400).json({ error: 'Violation du format de l\'identité de la passerelle.' });
    }
    const imei = imeiMatch[1];

    // Résolution contextuelle en temps réel via l'association actuelle de l'ECS Panel
    const mapping = await dbGet(
      `SELECT id AS ecs_panel_id, client_id FROM ecs_panels WHERE trb_imei = ?`,
      [imei]
    );

    // Déclaration automatique dans le registre si le modem TRB est inconnu f la base
    const existingDevice = await dbGet(`SELECT id FROM trb_devices WHERE imei = ?`, [imei]);
    if (!existingDevice) {
      await dbRun(
        `INSERT INTO trb_devices (trb_id, imei, online_status, status, last_heartbeat)
         VALUES (?, ?, 'ONLINE', 'discovered', strftime('%s','now'))`,
        [gateway_id, imei]
      );
    }

    for (const record of batch) {
      const eventTs = Math.floor(record.ts); 
      const rawText = record.data;           

      let eventType = 'FAULT';
      if (rawText.includes('ALARME') || rawText.includes('FIRE') || rawText.includes('FEU')) eventType = 'FIRE';
      if (rawText.includes('REARMEMENT') || rawText.includes('RESTORE') || rawText.includes('RETABLISSEMENT')) eventType = 'RESTORE';

      // Journalisation dans la table unifiée (les IDs sont NULL si la TRB n'est pas encore assignée)
      const clientContextId = mapping ? mapping.client_id : null;
      const panelContextId = mapping ? mapping.ecs_panel_id : null;

      const result = await dbRun(
        `INSERT INTO all_gateways_events (trb_imei, ecs_panel_id, client_id, type, raw_data, ts)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [imei, panelContextId, clientContextId, eventType, rawText, eventTs]
      );

      // WebSocket Broadcast Live Payload
      try {
        let client_name = 'Non associé';
        let panel_name = 'Inconnu / Flux non routé';
        
        if (clientContextId) {
          const cRow = await dbGet(`SELECT company_name FROM clients WHERE id = ?`, [clientContextId]);
          if (cRow) client_name = cRow.company_name;
        }
        if (panelContextId) {
          const pRow = await dbGet(`SELECT panel_name FROM ecs_panels WHERE id = ?`, [panelContextId]);
          if (pRow) panel_name = pRow.panel_name;
        }

        const livePayload = {
          id: result.lastID,
          trb_imei: imei,
          ecs_panel_id: panelContextId,
          client_id: clientContextId,
          client_name,
          panel_name,
          type: eventType,
          raw_data: rawText,
          ts: eventTs,
          received_at: new Date().toISOString()
        };

        broadcastEvent(livePayload);
      } catch (wsErr) {
        console.warn('[WS Ingress Broadcast Skipped]:', wsErr.message);
      }
    }

    await dbRun(
      `UPDATE trb_devices SET last_heartbeat = strftime('%s','now'), online_status = 'ONLINE' WHERE imei = ?`,
      [imei]
    );

    return res.json({ ok: true, records_inserted: batch.length });
  } catch (err) {
    console.error('[Ingestion Inbound Event Batch Error]', err);
    return res.status(500).json({ error: 'Échec d\'ingestion des données TRB.', details: err.message });
  }
});

// 2. LWT Status Route
router.post('/gateways/:gateway_id/status', async (req, res) => {
  try {
    const { gateway_id } = req.params;
    const statusPayload = req.body.status;

    const imeiMatch = gateway_id.match(/trb142-([0-9]{15})/);
    if (!imeiMatch) return res.status(400).json({ error: 'Format d\'identité invalide.' });
    const imei = imeiMatch[1];

    const networkStatus = statusPayload === 'online' ? 'ONLINE' : 'OFFLINE';

    await dbRun(
      `UPDATE trb_devices SET online_status = ?, last_heartbeat = strftime('%s','now') WHERE imei = ?`,
      [networkStatus, imei]
    );

    return res.json({ ok: true, updated_status: networkStatus });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Heartbeat Route
router.post('/gateways/:gateway_id/heartbeat', async (req, res) => {
  try {
    const { gateway_id } = req.params;
    const { ts } = req.body;

    const imeiMatch = gateway_id.match(/trb142-([0-9]{15})/);
    if (!imeiMatch) return res.status(400).json({ error: 'Format d\'identité invalide.' });
    const imei = imeiMatch[1];

    await dbRun(
      `UPDATE trb_devices SET online_status = 'ONLINE', last_heartbeat = ? WHERE imei = ?`,
      [ts || Math.floor(Date.now() / 1000), imei]
    );

    return res.json({ status: 'acknowledged' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. UI Query - Fetch Chronological Journal
router.get('/', authenticate, async (req, res) => {
  try {
    const allowed = await getAllowedClientIds(req.user);
    if (!allowed.length) return res.json({ events: [] });

    const { type, ecs_panel_id, limit = 100, client_id, unassociated } = req.query;
    let params = [];
    let sql = `SELECT e.*, c.company_name AS client_name, p.panel_name
               FROM all_gateways_events e
               LEFT JOIN clients c ON c.id = e.client_id
               LEFT JOIN ecs_panels p ON p.id = e.ecs_panel_id
               WHERE e.hidden_at IS NULL`;

    if (unassociated === 'true') {
      sql += ` AND e.client_id IS NULL`;
    } else {
      let ids = allowed;
      if (client_id) {
        const cid = Number(client_id);
        if (!allowed.includes(cid)) return res.status(403).json({ message: 'Accès refusé.' });
        ids = [cid];
      }
      const ph = ids.map(() => '?').join(',');
      sql += ` AND (e.client_id IN (${ph}) OR e.client_id IS NULL)`;
      params.push(...ids);
    }

    if (type) { 
      sql += ' AND e.type = ?'; 
      params.push(type); 
    }
    if (ecs_panel_id) { 
      sql += ' AND e.ecs_panel_id = ?'; 
      params.push(Number(ecs_panel_id)); 
    }

    sql += ` ORDER BY e.ts DESC LIMIT ?`;
    params.push(Number(limit));

    const events = await dbAll(sql, params);
    res.json({ events });
  } catch (err) {
    console.error('[Journal GET Error]', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// 5. Soft Delete Event Log row
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await dbRun(
      `UPDATE all_gateways_events SET hidden_at = strftime('%s','now'), hidden_by = ?, hidden_reason = 'deleted'
       WHERE id = ?`,
      [req.user.id, Number(req.params.id)]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

export default router;