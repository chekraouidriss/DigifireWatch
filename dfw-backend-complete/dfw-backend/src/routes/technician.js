// src/routes/technician.js
import { Router } from 'express';
import { dbAll } from '../db.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// 🚀 POST/GET unifié : Récupérer le périmètre de centrales ECS du technicien connecté
router.get('/panels', authenticate, async (req, res) => {
  try {
    // Vérification de sécurité : Seuls les techniciens (et admins) ont accès
    if (req.user.role !== 'technician' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès réservé aux techniciens de maintenance.' });
    }

    let sql;
    let params = [];

    if (req.user.role === 'admin') {
      // L'admin voit tout le parc pour le debug
      sql = `
        SELECT p.id, p.panel_name, p.panel_model, p.trb_imei, c.company_name, t.online_status AS gw_status
        FROM ecs_panels p
        LEFT JOIN clients c ON c.id = p.client_id
        LEFT JOIN trb_devices t ON t.imei = p.trb_imei
        ORDER BY p.id DESC
      `;
    } else {
      // ⚡ REQUÊTE TECHNIQUE : Filtrer uniquement via les clients liés au technicien f table `user_clients`
      sql = `
        SELECT p.id, p.panel_name, p.panel_model, p.trb_imei, c.company_name, t.online_status AS gw_status
        FROM ecs_panels p
        INNER JOIN user_clients uc ON uc.client_id = p.client_id
        LEFT JOIN clients c ON c.id = p.client_id
        LEFT JOIN trb_devices t ON t.imei = p.trb_imei
        WHERE uc.user_id = ?
        ORDER BY p.id DESC
      `;
      params.push(req.user.id);
    }

    const panels = await dbAll(sql, params);
    
    // Renvoyer la structure exacte attendue par l'UI [panels]
    return res.json({ success: true, panels });

  } catch (err) {
    console.error('[Backend Technician Panels Ingress Error]', err);
    return res.status(500).json({ message: 'Erreur interne lors du chargement des centrales.' });
  }
});

export default router;