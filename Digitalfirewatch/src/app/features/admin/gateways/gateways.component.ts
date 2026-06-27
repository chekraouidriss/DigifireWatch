import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Gateway {
  id: number;
  imei: string;
  trb_id: string;
  status: 'ONLINE' | 'STALE' | 'OFFLINE';
  claim_status: 'claimed' | 'discovered' | 'decommissioned';
  client?: string;
  site?: string;
  last_seen: string;
}

@Component({
  selector: 'app-gateways',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">

      <div class="page-header">
        <div>
          <h2 class="page-title">Gateways TRB</h2>
          <p class="page-sub">Gérez les identifiants IMEI et associez chaque dispositif à un client</p>
        </div>
        <div class="discovered-alert" *ngIf="discovered().length > 0">
          <span class="pulse-dot"></span>
          {{ discovered().length }} gateway(s) non assigné(s)
        </div>
      </div>

      <!-- Discovered (unassigned) -->
      <div class="card alert-card" *ngIf="discovered().length > 0">
        <div class="card-header">
          <h3 class="card-title">⚠ Gateways découverts — En attente d'assignation</h3>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr>
              <th>TRB ID</th><th>IMEI</th><th>Statut réseau</th><th>Premier contact</th><th>Action</th>
            </tr></thead>
            <tbody>
              <tr *ngFor="let gw of discovered()">
                <td><span class="mono accent">{{ gw.trb_id }}</span></td>
                <td><span class="mono dim">{{ gw.imei }}</span></td>
                <td><span class="status-chip" [class]="gw.status.toLowerCase()"><span class="dot"></span>{{ gw.status }}</span></td>
                <td class="mono muted">{{ gw.last_seen }}</td>
                <td>
                  <button class="btn-primary small" (click)="openClaim(gw)">
                    + Assigner
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Claimed gateways -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Gateways assignés</h3>
          <span class="badge">{{ claimed().length }}</span>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr>
              <th>TRB ID</th><th>IMEI</th><th>Client</th><th>Site</th><th>Statut réseau</th><th>Dernier contact</th><th>Actions</th>
            </tr></thead>
            <tbody>
              <tr *ngFor="let gw of claimed()">
                <td><span class="mono accent">{{ gw.trb_id }}</span></td>
                <td><span class="mono dim">{{ gw.imei }}</span></td>
                <td><strong>{{ gw.client }}</strong></td>
                <td>{{ gw.site }}</td>
                <td><span class="status-chip" [class]="gw.status.toLowerCase()"><span class="dot"></span>{{ gw.status }}</span></td>
                <td class="mono muted">{{ gw.last_seen }}</td>
                <td>
                  <button class="btn-ghost small" (click)="openClaim(gw)">Modifier</button>
                  <button class="btn-danger small" (click)="decommission(gw)">Retirer</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Claim modal -->
      <div class="modal-backdrop" *ngIf="modalGw()" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Assigner {{ modalGw()?.trb_id }}</h3>
            <button class="modal-close" (click)="closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <div class="info-row">
              <span class="info-label">IMEI</span>
              <span class="mono">{{ modalGw()?.imei }}</span>
            </div>
            <div class="field-group">
              <label class="field-label">Client</label>
              <select class="field-select" [(ngModel)]="claimClient">
                <option value="">— Sélectionner un client —</option>
                <option *ngFor="let c of clients" [value]="c">{{ c }}</option>
              </select>
            </div>
            <div class="field-group">
              <label class="field-label">Site</label>
              <select class="field-select" [(ngModel)]="claimSite">
                <option value="">— Sélectionner un site —</option>
                <option *ngFor="let s of sites" [value]="s">{{ s }}</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" (click)="closeModal()">Annuler</button>
            <button class="btn-primary" (click)="confirmClaim()">Confirmer l'assignation</button>
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

    .page { display: flex; flex-direction: column; gap: 20px; }

    .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .page-title { font-size: 20px; font-weight: 700; color: var(--text); }
    .page-sub { font-size: 13px; color: var(--muted); margin-top: 4px; }

    .discovered-alert {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 16px; border-radius: 20px;
      background: rgba(244,162,97,.1); border: 1px solid rgba(244,162,97,.3);
      color: var(--amber); font-size: 13px; font-weight: 500;
    }
    .pulse-dot {
      width: 8px; height: 8px; border-radius: 50%; background: var(--amber);
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.8)} }

    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
    .alert-card { border-color: rgba(244,162,97,.4); }
    .card-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px; border-bottom: 1px solid var(--border);
    }
    .card-title { font-size: 14px; font-weight: 600; color: var(--text); }
    .badge {
      font-family: 'JetBrains Mono', monospace; font-size: 11px;
      color: var(--muted); background: var(--surface2);
      padding: 3px 10px; border-radius: 20px; border: 1px solid var(--border);
    }

    .table-wrap { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th {
      text-align: left; padding: 10px 16px;
      font-size: 11px; text-transform: uppercase; letter-spacing: .08em;
      color: var(--dim); border-bottom: 1px solid var(--border); white-space: nowrap;
    }
    .data-table td { padding: 13px 16px; border-bottom: 1px solid var(--border); font-size: 13px; color: var(--text); vertical-align: middle; }
    .data-table tr:last-child td { border-bottom: none; }
    .data-table tr:hover td { background: var(--surface2); }

    .mono { font-family: 'JetBrains Mono', monospace; }
    .accent { color: var(--accent); }
    .dim { color: var(--dim); font-size: 12px; }
    .muted { color: var(--muted); font-size: 12px; }

    .status-chip {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 3px 9px; border-radius: 20px;
      font-size: 10px; font-weight: 600; font-family: 'JetBrains Mono', monospace; text-transform: uppercase;
    }
    .status-chip .dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
    .status-chip.online  { color: var(--green); background: rgba(42,157,143,.1); border: 1px solid rgba(42,157,143,.25); }
    .status-chip.stale   { color: var(--amber); background: rgba(244,162,97,.1);  border: 1px solid rgba(244,162,97,.25); }
    .status-chip.offline { color: var(--dim);   background: rgba(90,99,120,.1);   border: 1px solid rgba(90,99,120,.25); }

    .btn-primary {
      padding: 8px 16px; background: var(--accent); color: #fff;
      border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;
      transition: background .15s;
    }
    .btn-primary:hover { background: #c1121f; }
    .btn-ghost {
      padding: 8px 16px; background: transparent; color: var(--muted);
      border: 1px solid var(--border); border-radius: 8px; font-size: 13px; cursor: pointer;
      transition: all .15s;
    }
    .btn-ghost:hover { border-color: var(--muted); color: var(--text); }
    .btn-danger {
      padding: 8px 16px; background: transparent; color: var(--accent);
      border: 1px solid rgba(230,57,70,.3); border-radius: 8px; font-size: 13px; cursor: pointer;
      transition: all .15s; margin-left: 6px;
    }
    .btn-danger:hover { background: rgba(230,57,70,.08); }
    .small { padding: 5px 10px; font-size: 12px; }

    /* Modal */
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,.6); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px;
    }
    .modal {
      background: var(--surface); border: 1px solid var(--border); border-radius: 16px;
      width: 100%; max-width: 440px;
    }
    .modal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 24px; border-bottom: 1px solid var(--border);
    }
    .modal-header h3 { font-size: 16px; font-weight: 600; color: var(--text); }
    .modal-close { background: none; border: none; cursor: pointer; color: var(--dim); font-size: 18px; }
    .modal-close:hover { color: var(--text); }
    .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
    .modal-footer {
      display: flex; justify-content: flex-end; gap: 10px;
      padding: 16px 24px; border-top: 1px solid var(--border);
    }

    .info-row {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 14px; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px;
    }
    .info-label { font-size: 12px; color: var(--dim); min-width: 40px; }

    .field-group { display: flex; flex-direction: column; gap: 6px; }
    .field-label { font-size: 13px; font-weight: 500; color: var(--muted); }
    .field-select {
      background: var(--surface2); border: 1px solid var(--border); border-radius: 10px;
      color: var(--text); padding: 11px 14px; font-size: 14px; font-family: 'Inter', sans-serif;
      outline: none; cursor: pointer; width: 100%;
    }
    .field-select:focus { border-color: var(--accent); }
  `],
})
export class GatewaysComponent {
  gateways = signal<Gateway[]>([
    { id: 1, imei: '356938035643809', trb_id: 'TRB-43809', status: 'ONLINE',  claim_status: 'claimed',    client: 'Yassin', site: 'Hôtel Atlas',      last_seen: 'Il y a 12s'  },
    { id: 2, imei: '356938035643820', trb_id: 'TRB-43820', status: 'OFFLINE', claim_status: 'claimed',    client: 'Driss',  site: 'Résidence Agadir', last_seen: 'Il y a 4h'   },
    { id: 3, imei: '356938035643831', trb_id: 'TRB-43831', status: 'STALE',   claim_status: 'discovered', last_seen: 'Il y a 3min' },
  ]);

  modalGw    = signal<Gateway | null>(null);
  claimClient = '';
  claimSite   = '';

  clients = ['Yassin', 'Driss', 'Sami'];
  sites   = ['Hôtel Atlas', 'Résidence Agadir', 'École Française', 'Nouveau site'];

  discovered = () => this.gateways().filter(g => g.claim_status === 'discovered');
  claimed    = () => this.gateways().filter(g => g.claim_status === 'claimed');

  openClaim(gw: Gateway): void {
    this.modalGw.set(gw);
    this.claimClient = gw.client ?? '';
    this.claimSite   = gw.site ?? '';
  }

  closeModal(): void { this.modalGw.set(null); }

  confirmClaim(): void {
    const gw = this.modalGw();
    if (!gw || !this.claimClient || !this.claimSite) return;
    this.gateways.update(list =>
      list.map(g => g.id === gw.id
        ? { ...g, client: this.claimClient, site: this.claimSite, claim_status: 'claimed' }
        : g
      )
    );
    this.closeModal();
    // In production: call GatewayService.claim(gw.id, clientId, siteId)
  }

  decommission(gw: Gateway): void {
    if (!confirm(`Retirer ${gw.trb_id} ?`)) return;
    this.gateways.update(list =>
      list.map(g => g.id === gw.id ? { ...g, claim_status: 'decommissioned', client: undefined, site: undefined } : g)
    );
  }
}
