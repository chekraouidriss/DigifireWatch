import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface GatewayRow {
  trb_id: string;
  client: string;
  site: string;
  status: 'ONLINE' | 'STALE' | 'OFFLINE';
  last_seen: string;
  buffer: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard">

      <!-- KPI row -->
      <div class="kpi-grid">
        <div class="kpi-card" *ngFor="let k of kpis">
          <div class="kpi-label">{{ k.label }}</div>
          <div class="kpi-val" [style.color]="k.color">{{ k.value }}</div>
          <div class="kpi-sub">{{ k.sub }}</div>
        </div>
      </div>

      <!-- Gateways table -->
      <div class="section">
        <div class="section-header">
          <h3 class="section-title">Gateways actifs</h3>
          <span class="section-badge">{{ gateways().length }} dispositifs</span>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Identifiant</th>
                <th>Client</th>
                <th>Site</th>
                <th>Statut</th>
                <th>Dernier contact</th>
                <th>Buffer</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let gw of gateways()">
                <td><span class="mono accent">{{ gw.trb_id }}</span></td>
                <td><span class="client-name">{{ gw.client }}</span></td>
                <td>{{ gw.site }}</td>
                <td>
                  <span class="status-chip" [class]="gw.status.toLowerCase()">
                    <span class="dot"></span>
                    {{ gw.status }}
                  </span>
                </td>
                <td class="mono muted">{{ gw.last_seen }}</td>
                <td>
                  <div class="buffer-bar">
                    <div class="buffer-fill" [style.width.%]="gw.buffer"></div>
                  </div>
                  <span class="mono small">{{ gw.buffer }}%</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Recent events -->
      <div class="section">
        <div class="section-header">
          <h3 class="section-title">Événements récents</h3>
        </div>
        <div class="events-list">
          <div class="event-row" *ngFor="let e of events" [class]="e.type.toLowerCase()">
            <span class="event-type-badge" [class]="e.type.toLowerCase()">{{ e.type }}</span>
            <span class="event-client mono">{{ e.trb_id }}</span>
            <span class="event-msg">{{ e.message }}</span>
            <span class="event-time mono muted">{{ e.time }}</span>
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

    /* KPI */
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
    .kpi-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 14px; padding: 20px 24px;
    }
    .kpi-label { font-size: 12px; color: var(--dim); text-transform: uppercase; letter-spacing: .08em; margin-bottom: 8px; }
    .kpi-val { font-size: 32px; font-weight: 700; font-family: 'JetBrains Mono', monospace; line-height: 1; }
    .kpi-sub { font-size: 12px; color: var(--muted); margin-top: 6px; }

    /* Section */
    .section { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
    .section-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 18px 20px; border-bottom: 1px solid var(--border);
    }
    .section-title { font-size: 15px; font-weight: 600; color: var(--text); }
    .section-badge {
      font-family: 'JetBrains Mono', monospace; font-size: 11px;
      color: var(--muted); background: var(--surface2);
      padding: 3px 10px; border-radius: 20px; border: 1px solid var(--border);
    }

    /* Table */
    .table-wrap { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th {
      text-align: left; padding: 10px 16px;
      font-size: 11px; text-transform: uppercase; letter-spacing: .08em;
      color: var(--dim); border-bottom: 1px solid var(--border);
      white-space: nowrap;
    }
    .data-table td {
      padding: 13px 16px; border-bottom: 1px solid var(--border);
      font-size: 13px; color: var(--text); vertical-align: middle;
    }
    .data-table tr:last-child td { border-bottom: none; }
    .data-table tr:hover td { background: var(--surface2); }

    .mono { font-family: 'JetBrains Mono', monospace; }
    .accent { color: var(--accent); }
    .muted { color: var(--muted); }
    .small { font-size: 11px; }
    .client-name { font-weight: 600; }

    /* Status chips */
    .status-chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 10px; border-radius: 20px;
      font-size: 11px; font-weight: 600; font-family: 'JetBrains Mono', monospace;
      text-transform: uppercase; letter-spacing: .06em;
    }
    .status-chip .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    .status-chip.online  { color: var(--green); background: rgba(42,157,143,.1); border: 1px solid rgba(42,157,143,.25); }
    .status-chip.stale   { color: var(--amber); background: rgba(244,162,97,.1); border: 1px solid rgba(244,162,97,.25); }
    .status-chip.offline { color: var(--dim);   background: rgba(90,99,120,.1);  border: 1px solid rgba(90,99,120,.25); }

    /* Buffer */
    .buffer-bar { height: 4px; background: var(--surface2); border-radius: 2px; width: 80px; margin-bottom: 3px; }
    .buffer-fill { height: 100%; background: var(--green); border-radius: 2px; }

    /* Events */
    .events-list { display: flex; flex-direction: column; }
    .event-row {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 20px; border-bottom: 1px solid var(--border);
      font-size: 13px;
    }
    .event-row:last-child { border-bottom: none; }
    .event-row:hover { background: var(--surface2); }

    .event-type-badge {
      padding: 2px 8px; border-radius: 4px;
      font-size: 10px; font-weight: 700; font-family: 'JetBrains Mono', monospace;
      text-transform: uppercase; flex-shrink: 0;
    }
    .event-type-badge.fire    { background: rgba(230,57,70,.15);   color: var(--accent); }
    .event-type-badge.fault   { background: rgba(244,162,97,.15);  color: var(--amber); }
    .event-type-badge.restore { background: rgba(42,157,143,.15);  color: var(--green); }

    .event-client { color: var(--accent); font-size: 12px; flex-shrink: 0; }
    .event-msg    { flex: 1; color: var(--text); }
    .event-time   { font-size: 11px; flex-shrink: 0; }
  `],
})
export class AdminDashboardComponent implements OnInit {
  gateways = signal<GatewayRow[]>([]);

  kpis = [
    { label: 'Gateways en ligne',   value: '2',  sub: 'sur 3 actifs',      color: '#2a9d8f' },
    { label: 'Événements 24h',      value: '47', sub: 'dont 2 alarmes',    color: '#e8eaf0' },
    { label: 'Clients actifs',      value: '3',  sub: 'Yassin, Driss, Sami', color: '#e8eaf0' },
    { label: 'Buffer moyen',        value: '4%', sub: 'Stockage TRB',      color: '#2a9d8f' },
  ];

  events = [
    { type: 'FIRE',    trb_id: 'TRB-43809', message: 'ALARME POINT Z001 B3 A.001 — Zone cuisine',    time: '14:32:01' },
    { type: 'FAULT',   trb_id: 'TRB-77291', message: 'DEFAUT COM B2 — Liaison secteur coupée',       time: '13:18:44' },
    { type: 'RESTORE', trb_id: 'TRB-43809', message: 'RETABLISSEMENT Z001 B3 — Alarme levée',        time: '12:55:09' },
    { type: 'FAULT',   trb_id: 'TRB-12034', message: 'DEFAUT ALIM — Batterie faible détectée',       time: '11:02:37' },
  ];

  ngOnInit(): void {
    // In production: inject GatewayService and load from API
    this.gateways.set([
      { trb_id: 'TRB-43809', client: 'Yassin',  site: 'Hôtel Atlas',       status: 'ONLINE',  last_seen: 'Il y a 12s',  buffer: 2  },
      { trb_id: 'TRB-12034', client: 'Driss',   site: 'Résidence Agadir',  status: 'OFFLINE', last_seen: 'Il y a 4h',   buffer: 78 },
      { trb_id: 'TRB-77291', client: 'Sami',    site: 'École Française',   status: 'STALE',   last_seen: 'Il y a 3min', buffer: 15 },
    ]);
  }
}
