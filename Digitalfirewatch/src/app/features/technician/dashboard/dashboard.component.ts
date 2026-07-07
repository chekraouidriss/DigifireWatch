// src/app/features/technician/dashboard/dashboard.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface EcsPanel {
  id: number;
  panel_name: string;
  panel_model: string;
  trb_imei: string | null;
  company_name: string;      // Maison Mère
  gw_status: 'ONLINE' | 'STALE' | 'OFFLINE' | null;
}

@Component({
  selector: 'app-technician-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-container">
      <h2 class="page-title">Mes centrales ECS assignées</h2>
      <p class="page-sub">Établissements et équipements SSI sous votre responsabilité de maintenance</p>

      <div class="sites-list">
        <div class="site-card" *ngFor="let p of panels()">
          <div class="card-left">
            <div class="building-icon">🔧</div>
            <div class="site-details">
              <h4 class="site-name">{{ p.panel_name }} <small class="mono-model">{{ p.panel_model }}</small></h4>
              <p class="site-meta">
                <span class="client-lbl">🏢 {{ p.company_name }}</span>
                <span class="separator">•</span>
                <span class="trb-lbl mono">IMEI: {{ p.trb_imei || 'Aucun modem TRB lié' }}</span>
              </p>
            </div>
          </div>
          <div class="card-right">
            <span class="status-chip" [class]="(p.gw_status || 'OFFLINE').toLowerCase()">
              <span class="dot"></span>
              {{ p.trb_imei ? p.gw_status : 'NON PROTEGÉ' }}
            </span>
          </div>
        </div>

        <div class="empty-box" *ngIf="panels().length === 0">
          Aucune centrale ECS de maintenance assignée à votre compte pour le moment.
        </div>
      </div>
    </div>
  `,
  styles: [`
    .space-container { display: flex; flex-direction: column; gap: 16px; font-family: 'Inter', sans-serif; color: #e8eaf0; }
    .page-title { font-size: 20px; font-weight: 700; }
    .page-sub { font-size: 13px; color: #8892a4; margin-top: -8px; }
    
    .sites-list { display: flex; flex-direction: column; gap: 12px; margin-top: 10px; max-width: 800px; }
    .site-card { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; background: #181c27; border: 1px solid #2a3045; border-radius: 14px; transition: border-color 0.15s; }
    .site-card:hover { border-color: #457b9d; }
    
    .card-left { display: flex; align-items: center; gap: 16px; }
    .building-icon { font-size: 24px; }
    .site-name { font-size: 15px; font-weight: 600; color: #e8eaf0; }
    .mono-model { font-size: 11px; font-family: 'JetBrains Mono', monospace; background: rgba(255,255,255,0.05); padding: 1px 6px; border-radius: 4px; margin-left: 6px; color: #457b9d; }
    .site-meta { font-size: 12px; color: #8892a4; margin-top: 4px; display: flex; align-items: center; gap: 6px; }
    .mono { font-family: 'JetBrains Mono', monospace; }
    .client-lbl { font-weight: 500; }
    .separator { color: #5a6378; }
    
    .status-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; }
    .status-chip .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    .status-chip.online { color: #2a9d8f; background: rgba(42,157,143,.1); border: 1px solid rgba(42,157,143,.25); }
    .status-chip.stale { color: #f4a261; background: rgba(244,162,97,.1); border: 1px solid rgba(244,162,97,.25); }
    .status-chip.offline { color: #ef4444; background: rgba(239, 68, 68, .1); border: 1px solid rgba(239, 68, 68, .25); }
    
    .empty-box { text-align: center; color: #5a6378; padding: 40px; background: #181c27; border-radius: 14px; border: 1px solid #2a3045; }
  `]
})
export class TechnicianDashboardComponent implements OnInit {
  panels = signal<EcsPanel[]>([]);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // 🚀 Liaison directe avec la route de production pour récupérer le périmètre du technicien connecté
    this.http.get<{ panels: EcsPanel[] }>(`${environment.apiUrl}/technician/panels`)
      .subscribe({
        next: (res) => this.panels.set(res.panels || []),
        error: (err) => console.error(err)
      });
  }
}