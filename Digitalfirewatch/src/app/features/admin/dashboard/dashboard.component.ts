// src/app/features/admin/dashboard/dashboard.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface DashboardStats {
  total: number;
  fire: number;
  fault: number;
  restore: number;
  online_gateways: number;
}

interface RecentEvent {
  id: number;
  trb_device_id: number;
  trb_id?: string;
  type: string;
  raw_data: string;
  ts: number;
  site_name?: string;
}

interface DashboardSite {
  id: number;
  name: string;
  city: string | null;
  gw_status: 'ONLINE' | 'STALE' | 'OFFLINE' | null;
  trb_id: string | null;
  client_name?: string;
}

interface ApiResponse {
  stats: DashboardStats;
  recent_events: RecentEvent[];
  sites: DashboardSite[];
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard">

      <!-- KPI row dynamic -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Gateways en ligne</div>
          <div class="kpi-val" style="color: #2a9d8f">{{ stats().online_gateways }}</div>
          <div class="kpi-sub">Sur l'ensemble du parc assigné</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Alarmes Incendie</div>
          <div class="kpi-val" style="color: #e63946">{{ stats().fire }}</div>
          <div class="kpi-sub">Flux TRB actifs non masqués</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Défauts Techniques</div>
          <div class="kpi-val" style="color: #f4a261">{{ stats().fault }}</div>
          <div class="kpi-sub">Défauts com, secteur ou batterie</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Événements</div>
          <div class="kpi-val" style="color: #e8eaf0">{{ stats().total }}</div>
          <div class="kpi-sub">Signaux stockés en base SQLite</div>
        </div>
      </div>

      <!-- Section: État des Sites & Gateways Actifs -->
      <div class="section">
        <div class="section-header">
          <h3 class="section-title">Supervision des Centrales par Site</h3>
          <span class="section-badge">{{ sites().length }} site(s) actif(s)</span>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Site</th>
                <th>Ville</th>
                <th>Gateway liée</th>
                <th>Statut réseau</th>
                <th>Niveau de sécurité</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let s of sites()">
                <td><span class="client-name">{{ s.name }}</span></td>
                <td><span class="muted">{{ s.city || 'Non spécifiée' }}</span></td>
                <td><span class="mono accent">{{ s.trb_id || 'Aucune TRB' }}</span></td>
                <td>
                  <span *ngIf="s.trb_id" class="status-chip" [class]="(s.gw_status || 'OFFLINE').toLowerCase()">
                    <span class="dot"></span>
                    {{ s.gw_status || 'OFFLINE' }}
                  </span>
                  <span *ngIf="!s.trb_id" class="status-chip offline">
                    <span class="dot"></span>
                    NON LIÉE
                  </span>
                </td>
                <td>
                  <div class="buffer-bar">
                    <div class="buffer-fill" [style.width.%]="s.trb_id ? 100 : 0"></div>
                  </div>
                  <span class="mono small">{{ s.trb_id ? 'Protégé 100%' : 'Vulnérable 0%' }}</span>
                </td>
              </tr>
              <tr *ngIf="sites().length === 0">
                <td colspan="5" style="text-align: center;" class="muted">Aucun site ou passerelle détectée en base.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Section: Événements récents direct de la base -->
      <div class="section">
        <div class="section-header">
          <h3 class="section-title">Flux d'Événements Récents (Télémétrie)</h3>
        </div>
        <div class="events-list">
          <div class="event-row" *ngFor="let e of recentEvents()" [class]="e.type.toLowerCase()">
            <span class="event-type-badge" [class]="e.type.toLowerCase()">{{ e.type }}</span>
            <span class="event-client mono">&#64;{{ e.site_name || 'Site Inconnu' }}</span>
            <span class="event-msg">{{ e.raw_data }}</span>
            <span class="event-time mono muted">{{ formatTime(e.ts) }}</span>
          </div>
          <div class="event-row" *ngIf="recentEvents().length === 0" style="justify-content: center;">
            <span class="muted">Aucun signal ou alarme stocké pour le moment.</span>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host {
      --bg: #0f1117; --surface: #181c27; --surface2: #1e2333;
      --border: #2a3045; --accent: #e63946; --text: #e8eaf0;
      --muted: #8892a4; --dim: #5a6378; --green: #2a9d8f; --amber: #f4a261;
      display: block; font-family: 'Inter', sans-serif;
    }
    .dashboard { display: flex; flex-direction: column; gap: 24px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
    .kpi-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 20px 24px; }
    .kpi-label { font-size: 11px; color: var(--dim); text-transform: uppercase; letter-spacing: .08em; margin-bottom: 8px; }
    .kpi-val { font-size: 32px; font-weight: 700; font-family: 'JetBrains Mono', monospace; line-height: 1; }
    .kpi-sub { font-size: 12px; color: var(--muted); margin-top: 6px; }
    .section { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
    .section-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid var(--border); }
    .section-title { font-size: 15px; font-weight: 600; color: var(--text); }
    .section-badge { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--muted); background: var(--surface2); padding: 3px 10px; border-radius: 20px; border: 1px solid var(--border); }
    .table-wrap { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th { text-align: left; padding: 10px 16px; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--dim); border-bottom: 1px solid var(--border); white-space: nowrap; }
    .data-table td { padding: 13px 16px; border-bottom: 1px solid var(--border); font-size: 13px; color: var(--text); vertical-align: middle; }
    .data-table tr:last-child td { border-bottom: none; }
    .data-table tr:hover td { background: var(--surface2); }
    .mono { font-family: 'JetBrains Mono', monospace; }
    .accent { color: var(--accent); }
    .muted { color: var(--muted); }
    .small { font-size: 11px; }
    .client-name { font-weight: 600; }
    .status-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: .06em; }
    .status-chip .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    .status-chip.online { color: var(--green); background: rgba(42,157,143,.1); border: 1px solid rgba(42,157,143,.25); }
    .status-chip.stale { color: var(--amber); background: rgba(244,162,97,.1); border: 1px solid rgba(244,162,97,.25); }
    .status-chip.offline { color: var(--dim); background: rgba(90,99,120,.1); border: 1px solid rgba(90,99,120,.25); }
    .buffer-bar { height: 4px; background: var(--surface2); border-radius: 2px; width: 80px; margin-bottom: 3px; }
    .buffer-fill { height: 100%; background: var(--green); border-radius: 2px; }
    .events-list { display: flex; flex-direction: column; }
    .event-row { display: flex; align-items: center; gap: 12px; padding: 12px 20px; border-bottom: 1px solid var(--border); font-size: 13px; }
    .event-row:last-child { border-bottom: none; }
    .event-row:hover { background: var(--surface2); }
    .event-type-badge { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; flex-shrink: 0; }
    .event-type-badge.fire { background: rgba(230,57,70,.15); color: var(--accent); }
    .event-type-badge.fault { background: rgba(244,162,97,.15); color: var(--amber); }
    .event-type-badge.restore { background: rgba(42,157,143,.15); color: var(--green); }
    .event-client { color: var(--accent); font-size: 12px; flex-shrink: 0; }
    .event-msg { flex: 1; color: var(--text); }
    .event-time { font-size: 11px; flex-shrink: 0; }
  `]
})
export class AdminDashboardComponent implements OnInit {
  // Signals dynamisés
  stats = signal<DashboardStats>({ total: 0, fire: 0, fault: 0, restore: 0, online_gateways: 0 });
  recentEvents = signal<RecentEvent[]>([]);
  sites = signal<DashboardSite[]>([]);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchDashboardData();
  }

  private fetchDashboardData(): void {
    // Appel direct men la route de ton API locale Express
    this.http.get<ApiResponse>(`${environment.apiUrl}/dashboard`)
      .subscribe({
        next: (res) => {
          this.stats.set(res.stats);
          this.recentEvents.set(res.recent_events || []);
          this.sites.set(res.sites || []);
        },
        error: (err) => console.error('Erreur chargement du dashboard dynamic:', err)
      });
  }

  formatTime(epoch: number): string {
    const date = new Date(epoch * 1000);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}