// src/app/features/admin/dashboard/dashboard.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface DashboardStats {
  total: number; fire: number; fault: number; restore: number; online_gateways: number;
}
interface RecentEvent {
  id: number; type: string; raw_data: string; ts: number; panel_name?: string; client_name?: string;
}
interface DashboardPanel {
  id: number; panel_name: string; panel_model: string; gw_status: string | null; trb_imei: string | null; company_name: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard">
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Gateways en ligne</div>
          <div class="kpi-val" style="color: #2a9d8f">{{ stats().online_gateways }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Alarmes Incendie</div>
          <div class="kpi-val" style="color: #e63946">{{ stats().fire }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Défauts Techniques</div>
          <div class="kpi-val" style="color: #f4a261">{{ stats().fault }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Événements</div>
          <div class="kpi-val" style="color: #e8eaf0">{{ stats().total }}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <h3 class="section-title">Supervision des Centrales par Entreprise</h3>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Entreprise</th><th>Centrale ECS</th><th>Modem IMEI</th><th>Statut réseau</th><th>Protection</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of panels()">
                <td><strong>{{ p.company_name }}</strong></td>
                <td>{{ p.panel_name }} <small class="mono">{{ p.panel_model }}</small></td>
                <td><span class="mono accent">{{ p.trb_imei || 'Aucune TRB' }}</span></td>
                <td>
                  <span class="status-chip" [class]="(p.gw_status || 'OFFLINE').toLowerCase()">
                    <span class="dot"></span>{{ p.gw_status || 'OFFLINE' }}
                  </span>
                </td>
                <td><span class="mono small">{{ p.trb_imei ? 'Protégé 100%' : 'Vulnérable 0%' }}</span></td>
              </tr>
              <tr *ngIf="panels().length === 0">
                <td colspan="5" style="text-align: center; color: var(--dim);">Aucune centrale détectée en base.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="section">
        <div class="section-header"><h3 class="section-title">Flux Télémétrie Temps Réel</h3></div>
        <div class="events-list">
          <div class="event-row" *ngFor="let e of recentEvents()" [class]="e.type.toLowerCase()">
            <span class="event-type-badge" [class]="e.type.toLowerCase()">{{ e.type }}</span>
            <span class="event-client mono">&#64;{{ e.client_name || 'Rogue' }} ➔ ({{ e.panel_name || 'Flux non routé' }})</span>
            <span class="event-msg">{{ e.raw_data }}</span>
            <span class="event-time mono muted">{{ formatTime(e.ts) }}</span>
          </div>
          <div class="event-row" *ngIf="recentEvents().length === 0" style="justify-content: center;">
            <span style="color: var(--dim);">Aucun signal stocké pour le moment.</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { --bg: #0f1117; --surface: #181c27; --surface2: #1e2333; --border: #2a3045; --accent: #e63946; --text: #e8eaf0; --muted: #8892a4; --dim: #5a6378; --green: #2a9d8f; --amber: #f4a261; display: block; font-family: 'Inter', sans-serif; }
    .dashboard { display: flex; flex-direction: column; gap: 24px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
    .kpi-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 20px 24px; }
    .kpi-label { font-size: 11px; color: var(--dim); text-transform: uppercase; margin-bottom: 8px; }
    .kpi-val { font-size: 32px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
    .section { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
    .section-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid var(--border); }
    .section-title { font-size: 15px; font-weight: 600; color: var(--text); }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th { text-align: left; padding: 10px 16px; font-size: 11px; text-transform: uppercase; color: var(--dim); border-bottom: 1px solid var(--border); }
    .data-table td { padding: 13px 16px; border-bottom: 1px solid var(--border); font-size: 13px; color: var(--text); }
    .status-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .status-chip .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    .status-chip.online { color: var(--green); background: rgba(42,157,143,.1); }
    .status-chip.stale { color: var(--amber); background: rgba(244,162,97,.1); }
    .status-chip.offline { color: var(--dim); background: rgba(90,99,120,.1); }
    .events-list { display: flex; flex-direction: column; }
    .event-row { display: flex; align-items: center; gap: 12px; padding: 12px 20px; border-bottom: 1px solid var(--border); font-size: 13px; }
    .event-type-badge { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
    .event-type-badge.fire { background: rgba(230,57,70,.15); color: var(--accent); }
    .event-type-badge.fault { background: rgba(244,162,97,.15); color: var(--amber); }
    .event-type-badge.restore { background: rgba(42,157,143,.15); color: var(--green); }
    .event-client { color: var(--accent); font-size: 12px; }
    .event-msg { flex: 1; color: var(--text); text-align: left; }
    .mono { font-family: 'JetBrains Mono', monospace; }
  `],
})
export class AdminDashboardComponent implements OnInit {
  stats = signal<DashboardStats>({ total: 0, fire: 0, fault: 0, restore: 0, online_gateways: 0 });
  recentEvents = signal<RecentEvent[]>([]);
  panels = signal<DashboardPanel[]>([]);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/dashboard`).subscribe({
      next: (res) => {
        this.stats.set(res.stats);
        this.recentEvents.set(res.recent_events || []);
        this.panels.set(res.panels || []);
      },
      error: (err) => console.error('Erreur dashboard dynamic loading:', err)
    });
  }

  formatTime(epoch: number): string {
    return new Date(epoch * 1000).toLocaleTimeString('fr-FR');
  }
}