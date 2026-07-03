// src/app/features/technician/sites/sites.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface DashboardSite {
  id: number;
  name: string;
  city: string | null;
  gw_status: 'ONLINE' | 'STALE' | 'OFFLINE' | null;
  trb_id: string | null;
  client_name?: string;
}

@Component({
  selector: 'app-sites',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-container">
      <h2 class="page-title">Mes sites assignés</h2>
      <p class="page-sub">Établissements SSI sous votre responsabilité de maintenance</p>

      <div class="sites-list">
        <div class="site-card" *ngFor="let s of sites()">
          <div class="card-left">
            <div class="building-icon">🏢</div>
            <div class="site-details">
              <h4 class="site-name">{{ s.name }}</h4>
              <p class="site-meta">
                <span class="client-lbl">{{ s.client_name || 'Client Supervisé' }}</span>
                <span class="separator">•</span>
                <span class="trb-lbl mono">{{ s.trb_id || 'Aucune passerelle TRB' }}</span>
              </p>
            </div>
          </div>
          <div class="card-right">
            <span class="status-chip" [class]="(s.gw_status || 'OFFLINE').toLowerCase()">
              <span class="dot"></span>
              {{ s.trb_id ? s.gw_status : 'NON LIÉE' }}
            </span>
          </div>
        </div>

        <div class="empty-box" *ngIf="sites().length === 0">
          Aucun site de maintenance assigné à votre compte pour le moment.
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
    .site-meta { font-size: 12px; color: #8892a4; margin-top: 4px; display: flex; align-items: center; gap: 6px; }
    .mono { font-family: 'JetBrains Mono', monospace; }
    .client-lbl { font-weight: 500; }
    
    .status-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; }
    .status-chip .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    .status-chip.online { color: #2a9d8f; background: rgba(42,157,143,.1); border: 1px solid rgba(42,157,143,.25); }
    .status-chip.stale { color: #f4a261; background: rgba(244,162,97,.1); border: 1px solid rgba(244,162,97,.25); }
    .status-chip.offline { color: #5a6378; background: rgba(90,99,120,.1); border: 1px solid rgba(90,99,120,.25); }
    
    .empty-box { text-align: center; color: #5a6378; padding: 40px; background: #181c27; border-radius: 14px; border: 1px solid #2a3045; }
  `]
})
export class SitesComponent implements OnInit {
  sites = signal<DashboardSite[]>([]);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // 🛠️ Jib les sites filtrés depuis le point d'accès du dashboard du technicien
    this.http.get<{ sites: DashboardSite[] }>(`${environment.apiUrl}/dashboard`)
      .subscribe({
        next: (res) => this.sites.set(res.sites || []),
        error: (err) => console.error('Erreur chargement sites technicien:', err)
      });
  }
}