// ─────────────────────────────────────────────
// ADMIN — Clients page stub
// src/app/features/admin/clients/clients.component.ts
// ─────────────────────────────────────────────
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stub-page">
      <div class="stub-icon">👥</div>
      <h2>Clients</h2>
      <p>Gérez les clients et associez-les aux sites et gateways.<br>
         <strong>API :</strong> GET /api/admin/clients</p>
      <div class="clients-preview">
        <div class="client-card" *ngFor="let c of clients">
          <div class="client-avatar">{{ c.name[0] }}</div>
          <div class="client-info">
            <span class="client-name">{{ c.name }}</span>
            <span class="client-meta">{{ c.site }} — {{ c.trb }}</span>
          </div>
          <span class="client-status" [class]="c.cls">{{ c.status }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { --accent:#e63946; --surface:#181c27; --surface2:#1e2333; --border:#2a3045; --text:#e8eaf0; --muted:#8892a4; --green:#2a9d8f; display:block; font-family:'Inter',sans-serif; }
    .stub-page { display:flex; flex-direction:column; align-items:center; gap:20px; padding:40px 0; text-align:center; }
    .stub-icon { font-size:48px; }
    h2 { font-size:22px; font-weight:700; color:var(--text); }
    p { color:var(--muted); font-size:14px; line-height:1.6; }
    strong { color:var(--accent); }
    .clients-preview { display:flex; flex-direction:column; gap:10px; width:100%; max-width:480px; }
    .client-card { display:flex; align-items:center; gap:14px; padding:14px 18px; background:var(--surface); border:1px solid var(--border); border-radius:12px; }
    .client-avatar { width:36px; height:36px; border-radius:50%; background:var(--accent); color:#fff; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:700; flex-shrink:0; }
    .client-info { flex:1; text-align:left; }
    .client-name { display:block; font-size:14px; font-weight:600; color:var(--text); }
    .client-meta { display:block; font-size:12px; color:var(--muted); font-family:'JetBrains Mono',monospace; }
    .client-status { font-size:11px; font-weight:600; padding:3px 9px; border-radius:20px; }
    .client-status.online  { color:var(--green); background:rgba(42,157,143,.1); border:1px solid rgba(42,157,143,.25); }
    .client-status.offline { color:var(--muted); background:var(--surface2); border:1px solid var(--border); }
  `],
})
export class ClientsComponent {
  clients = [
    { name: 'Yassin', site: 'Hôtel Atlas',      trb: 'TRB-43809', status: 'EN LIGNE',   cls: 'online'  },
    { name: 'Driss',  site: 'Résidence Agadir', trb: 'TRB-43820', status: 'HORS LIGNE', cls: 'offline' },
    { name: 'Sami',   site: 'École Française',  trb: 'TRB-43831', status: 'EN LIGNE',   cls: 'online'  },
  ];
}
