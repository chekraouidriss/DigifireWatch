// src/app/features/admin/gateways/gateways.component.ts
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface Gateway {
  id: number;
  imei: string;
  trb_id: string;
  online_status: 'ONLINE' | 'STALE' | 'OFFLINE';
  status: 'claimed' | 'discovered' | 'decommissioned';
  company_name?: string; // Mappé depuis le nouveau backend
  panel_name?: string;   // Mappé depuis le nouveau backend
  last_heartbeat: number | null;
}

interface Client { id: number; company_name: string; }
interface EcsPanel { id: number; panel_name: string; client_id: number; }

@Component({
  selector: 'app-gateways',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2 class="page-title">Gateways TRB</h2>
          <p class="page-sub">Manage IMEI identifiers and associate each device with a company and an ECS central unit</p>
        </div>
        <div class="discovered-alert" *ngIf="filteredDiscovered().length > 0">
          <span class="pulse-dot"></span>
          {{ filteredDiscovered().length }} unassigned gateway(s)
        </div>
      </div>

      <div class="search-container-wrap" style="margin-bottom: 4px; width: 100%;">
        <div class="search-wrap-input" style="display: flex; align-items: center; gap: 10px; background: #181c27; border: 1px solid #2a3045; border-radius: 12px; padding: 11px 16px; position: relative;">
          <span class="search-icon-lens" style="font-size: 14px; color: #8892a4;">🔍</span>
          <input 
            type="text" 
            [value]="searchTerm()" 
            (input)="onSearchChange($event)"
            placeholder="Search by TRB ID, IMEI, company, ECS panel or status..." 
            class="search-input-field"
            style="background: transparent; border: none; outline: none; width: 100%; color: #fff; font-size: 14px; font-family: 'Inter', sans-serif; padding-right: 24px;"
          />
          <button *ngIf="searchTerm()" class="btn-clear-search" (click)="clearSearch()" style="background: transparent; border: none; color: #8892a4; font-size: 18px; cursor: pointer; position: absolute; right: 16px; top: 50%; transform: translateY(-50%); padding: 0; line-height: 1;">✕</button>
        </div>
      </div>

      <div class="card alert-card" *ngIf="filteredDiscovered().length > 0">
        <div class="card-header">
          <h3 class="card-title">⚠ Discovered Gateways — Awaiting Assignment</h3>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr>
              <th>TRB ID</th><th>IMEI</th><th>Network status</th><th>Last contact</th><th>Action</th>
            </tr></thead>
            <tbody>
              <tr *ngFor="let gw of filteredDiscovered()">
                <td><span class="mono accent">{{ gw.trb_id || 'Device' }}</span></td>
                <td><span class="mono dim">{{ gw.imei }}</span></td>
                <td><span class="status-chip" [class]="gw.online_status.toLowerCase()"><span class="dot"></span>{{ gw.online_status }}</span></td>
                <td class="mono muted">{{ formatTimeAgo(gw.last_heartbeat) }}</td>
                <td>
                  <button class="btn-primary small" (click)="openClaim(gw)">+ Assign</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Assigned Gateways</h3>
          <span class="badge">{{ filteredClaimed().length }}</span>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr>
              <th>TRB ID</th><th>IMEI</th><th>Company (Parent Company)</th><th>ECS Central (SSI)</th><th>Network status</th><th>Last contact</th><th>Actions</th>
            </tr></thead>
            <tbody>
              <tr *ngFor="let gw of filteredClaimed()">
                <td><span class="mono accent">{{ gw.trb_id }}</span></td>
                <td><span class="mono dim">{{ gw.imei }}</span></td>
                <td><strong>{{ gw.company_name || 'Unassociated' }}</strong></td>
                <td>{{ gw.panel_name || 'Unrouted stream' }}</td>
                <td><span class="status-chip" [class]="gw.online_status.toLowerCase()"><span class="dot"></span>{{ gw.online_status }}</span></td>
                <td class="mono muted">{{ formatTimeAgo(gw.last_heartbeat) }}</td>
                <td>
                  <button class="btn-ghost small" (click)="openClaim(gw)">Modify</button>
                  <button class="btn-danger small" (click)="decommission(gw)">Remove</button>
                </td>
              </tr>
              <tr *ngIf="filteredClaimed().length === 0">
                <td colspan="7" style="text-align: center; color: var(--muted); padding: 20px; font-size: 13px;">No assigned gateway matches your search.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="modal-backdrop" *ngIf="modalGw()" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Assign {{ modalGw()?.trb_id || 'TRB' }}</h3>
            <button class="modal-close" (click)="closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <div class="info-row">
              <span class="info-label">IMEI</span>
              <span class="mono">{{ modalGw()?.imei }}</span>
            </div>
            
            <div class="field-group">
              <label class="field-label">Client Company *</label>
              <select class="field-select" [ngModel]="claimClientId()" (ngModelChange)="onClientChange($event)">
                <option value="">— Select a company —</option>
                <option *ngFor="let c of clients()" [value]="c.id">{{ c.company_name }}</option>
              </select>
            </div>

            <div class="field-group">
              <label class="field-label">Target Alarm ECS Panel *</label>
              <select class="field-select" [(ngModel)]="claimPanelId" [disabled]="!claimClientId() || filteredPanels().length === 0">
                <option value="">— {{ claimClientId() ? (filteredPanels().length === 0 ? 'No panel available' : 'Select the panel') : 'Select a client first' }} —</option>
                <option *ngFor="let p of filteredPanels()" [value]="p.id">{{ p.panel_name }}</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" (click)="closeModal()">Cancel</button>
            <button class="btn-primary" (click)="confirmClaim()" [disabled]="!claimClientId() || !claimPanelId">Confirm Pairing</button>
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
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 4px; }
    .page-title { font-size: 20px; font-weight: 700; color: var(--text); }
    .page-sub { font-size: 13px; color: var(--muted); margin-top: 4px; }
    .discovered-alert { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 20px; background: rgba(244,162,97,.1); border: 1px solid rgba(244,162,97,.3); color: var(--amber); font-size: 13px; font-weight: 500; }
    .pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--amber); animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.8)} }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
    .alert-card { border-color: rgba(244,162,97,.4); }
    .card-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border); }
    .card-title { font-size: 14px; font-weight: 600; color: var(--text); }
    .badge { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--muted); background: var(--surface2); padding: 3px 10px; border-radius: 20px; border: 1px solid var(--border); }
    .table-wrap { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th { text-align: left; padding: 10px 16px; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--dim); border-bottom: 1px solid var(--border); white-space: nowrap; }
    .data-table td { padding: 13px 16px; border-bottom: 1px solid var(--border); font-size: 13px; color: var(--text); vertical-align: middle; }
    .data-table tr:last-child td { border-bottom: none; }
    .data-table tr:hover td { background: var(--surface2); }
    .mono { font-family: 'JetBrains Mono', monospace; }
    .accent { color: var(--accent); }
    .dim { color: var(--dim); font-size: 12px; }
    .muted { color: var(--muted); font-size: 12px; }
    .status-chip { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 20px; font-size: 10px; font-weight: 600; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; }
    .status-chip .dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
    .status-chip.online { color: var(--green); background: rgba(42,157,143,.1); border: 1px solid rgba(42,157,143,.25); }
    .status-chip.stale { color: var(--amber); background: rgba(244,162,97,.1); border: 1px solid rgba(244,162,97,.25); }
    .status-chip.offline { color: var(--dim); background: rgba(90,99,120,.1); border: 1px solid rgba(90,99,120,.25); }
    .btn-primary { padding: 8px 16px; background: var(--accent); color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background .15s; }
    .btn-primary:hover { background: #c1121f; }
    .btn-ghost { padding: 8px 16px; background: transparent; color: var(--muted); border: 1px solid var(--border); border-radius: 8px; font-size: 13px; cursor: pointer; transition: all .15s; }
    .btn-ghost:hover { border-color: var(--muted); color: var(--text); }
    .btn-danger { padding: 8px 16px; background: transparent; color: var(--accent); border: 1px solid rgba(230,57,70,.3); border-radius: 8px; font-size: 13px; cursor: pointer; transition: all .15s; margin-left: 6px; }
    .btn-danger:hover { background: rgba(230,57,70,.08); }
    .small { padding: 5px 10px; font-size: 12px; }
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
    .modal { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; width: 100%; max-width: 440px; }
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid var(--border); }
    .modal-header h3 { font-size: 16px; font-weight: 600; color: var(--text); }
    .modal-close { background: none; border: none; cursor: pointer; color: var(--dim); font-size: 18px; }
    .modal-close:hover { color: var(--text); }
    .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid var(--border); }
    .info-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; }
    .info-label { font-size: 12px; color: var(--dim); min-width: 40px; }
    .field-group { display: flex; flex-direction: column; gap: 6px; }
    .field-label { font-size: 13px; font-weight: 500; color: var(--muted); }
    .field-select { background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; color: var(--text); padding: 11px 14px; font-size: 14px; outline: none; cursor: pointer; width: 100%; }
    .field-select:focus { border-color: var(--accent); }
    .field-select:disabled { opacity: 0.5; cursor: not-allowed; }
    .search-wrap-input:focus-within { border-color: var(--accent) !important; }
    .btn-clear-search:hover { color: #fff !important; }
  `]
})
export class GatewaysComponent implements OnInit {
  gateways = signal<Gateway[]>([]);
  clients  = signal<Client[]>([]);
  panels   = signal<EcsPanel[]>([]);

  modalGw       = signal<Gateway | null>(null);
  claimClientId = signal<string>('');
  claimPanelId  = '';

  searchTerm = signal<string>('');

  filteredDiscovered = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const items = this.gateways().filter(g => g.status === 'discovered');
    if (!query) return items;

    return items.filter(g => 
      (g.trb_id || '').toLowerCase().includes(query) || 
      g.imei.toLowerCase().includes(query) ||
      g.online_status.toLowerCase().includes(query)
    );
  });

  filteredClaimed = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const items = this.gateways().filter(g => g.status === 'claimed');
    if (!query) return items;

    return items.filter(g => 
      g.trb_id.toLowerCase().includes(query) || 
      g.imei.toLowerCase().includes(query) ||
      (g.company_name || '').toLowerCase().includes(query) ||
      (g.panel_name || '').toLowerCase().includes(query) ||
      g.online_status.toLowerCase().includes(query)
    );
  });

  filteredPanels = computed(() => {
    const cid = Number(this.claimClientId());
    if (!cid) return [];
    return this.panels().filter(p => p.client_id === cid);
  });

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadData();
  }

  onSearchChange(event: Event): void {
    const inputVal = (event.target as HTMLInputElement).value;
    this.searchTerm.set(inputVal);
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  loadData(): void {
    this.http.get<{ devices: Gateway[] }>(`${environment.apiUrl}/admin/trb-devices`)
      .subscribe({
        next: (res) => this.gateways.set(res.devices || []),
        error: (err) => console.error(err)
      });

    this.http.get<{ clients: Client[] }>(`${environment.apiUrl}/admin/clients`)
      .subscribe({
        next: (res) => this.clients.set(res.clients || []),
        error: (err) => console.error(err)
      });

    this.http.get<{ panels: EcsPanel[] }>(`${environment.apiUrl}/admin/ecs-panels`)
      .subscribe({
        next: (res) => this.panels.set(res.panels || []),
        error: (err) => console.error(err)
      });
  }

  openClaim(gw: Gateway): void {
    this.modalGw.set(gw);
    this.claimClientId.set('');
    this.claimPanelId = '';
  }

  onClientChange(newValue: string): void {
    this.claimClientId.set(newValue);
    this.claimPanelId = '';
  }

  closeModal(): void {
    this.modalGw.set(null);
  }

  confirmClaim(): void {
    const gw = this.modalGw();
    if (!gw || !this.claimPanelId) return;

    const targetPanelId = Number(this.claimPanelId);
    this.http.put(`${environment.apiUrl}/admin/ecs-panels/${targetPanelId}/assign-trb`, { trb_imei: gw.imei })
      .subscribe({
        next: () => {
          this.loadData();
          this.closeModal();
        },
        error: (err) => console.error('Error linking TRB:', err)
      });
  }

  decommission(gw: Gateway): void {
    if (!confirm(`Are you sure you want to permanently remove and decommission gateway ${gw.trb_id}?`)) return;
    
    this.http.put(`${environment.apiUrl}/admin/trb-devices/${gw.id}/decommission`, {})
      .subscribe({
        next: () => this.loadData(),
        error: (err) => console.error(err)
      });
  }

  formatTimeAgo(epoch: number | null): string {
    if (!epoch) return 'No contact';
    const now = Math.floor(Date.now() / 1000);
    const diff = now - epoch;

    if (diff < 60) return `${diff}s ago`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(epoch * 1000).toLocaleDateString('en-US');
  }
}