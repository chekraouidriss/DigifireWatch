// ── TECHNICIAN DASHBOARD
// src/app/features/technician/dashboard/dashboard.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-technician-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="display:flex;flex-direction:column;gap:16px;font-family:Inter,sans-serif;">
      <h2 style="color:#e8eaf0;font-size:20px;font-weight:700;">Mes sites assignés</h2>
      <div *ngFor="let s of sites" style="background:#181c27;border:1px solid #2a3045;border-radius:12px;padding:18px 20px;display:flex;align-items:center;gap:16px;">
        <span style="font-size:24px;">🏢</span>
        <div style="flex:1;">
          <div style="color:#e8eaf0;font-weight:600;font-size:14px;">{{ s.name }}</div>
          <div style="color:#8892a4;font-size:12px;margin-top:2px;">{{ s.client }} — {{ s.trb }}</div>
        </div>
        <span [style.color]="s.ok ? '#2a9d8f' : '#e63946'" style="font-size:12px;font-weight:600;">{{ s.ok ? '🟢 EN LIGNE' : '🔴 HORS LIGNE' }}</span>
      </div>
    </div>
  `,
})
export class TechnicianDashboardComponent {
  sites = [
    { name: 'Hôtel Atlas',     client: 'Yassin', trb: 'TRB-43809', ok: true  },
    { name: 'École Française', client: 'Sami',   trb: 'TRB-43831', ok: false },
  ];
}
