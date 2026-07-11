// src/app/features/technician/dashboard/dashboard.component.ts
import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

interface EcsPanel {
  id: number;
  panel_name: string;
  panel_model: string;
  trb_imei: string | null;
  company_name: string;      // Maison Mère
  norme: string;             // NF / EN
  has_cmsi: number;
  has_printer: number;
  loop_count: number;
  gw_status: 'ONLINE' | 'STALE' | 'OFFLINE' | null;
}

interface SsiEvent {
  id: number;
  trb_imei: string;
  ecs_panel_id: number | null;
  type: string;
  raw_data: string;
  ts: number;
}

@Component({
  selector: 'app-technician-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-container">
      <div class="dashboard-header-tech">
        <div>
          <h2 class="page-title">🔧 My Assigned Equipment & Central Units</h2>
          <p class="page-sub">Regulatory inventory of ECS / CMSI blocks under your maintenance responsibility</p>
        </div>
        <div class="live-status-indicator" [class.active]="wsConnected()">
          <span class="pulse-dot"></span>
          {{ wsConnected() ? 'Live Telemetry Link Active' : 'Logs stream disconnected' }}
        </div>
      </div>

      <div class="sites-list">
        <div class="panel-master-wrapper" *ngFor="let p of panels()">
          
          <div class="site-card" (click)="toggleTelemetryTerminal(p)" [class.active-terminal]="selectedPanelId() === p.id">
            <div class="card-left">
              <div class="building-icon">📟</div>
              <div class="site-details">
                <h4 class="site-name">
                  <span class="name-txt">{{ p.panel_name }}</span>
                  <span class="norme-badge-tech">{{ p.norme || 'NF' }}</span>
                  <small class="mono-model">{{ p.panel_model }}</small>
                </h4>
                
                <p class="site-meta">
                  <span class="client-lbl">🏢 {{ p.company_name }}</span>
                  <span class="separator">•</span>
                  <span class="trb-lbl mono">IMEI: {{ p.trb_imei || 'No TRB modem linked' }}</span>
                </p>

                <div class="ssi-specs-tech-row">
                  <span class="spec-pill-tech">Loops: <strong>{{ p.loop_count }}</strong></span>
                  <span class="spec-pill-tech" *ngIf="p.has_printer">🖨️ Integrated Printer</span>
                  <span class="spec-pill-tech cmsi" *ngIf="p.has_cmsi">⚡ Built-in CMSI Centralizer</span>
                </div>
              </div>
            </div>
            
            <div class="card-right-tech">
              <span class="status-chip" [class]="(p.gw_status || 'OFFLINE').toLowerCase()">
                <span class="dot"></span>
                {{ p.trb_imei ? p.gw_status : 'UNPROTECTED' }}
              </span>
              <span class="terminal-toggle-arrow">{{ selectedPanelId() === p.id ? '🔼 Hide Logs' : '🔽 View Live Stream' }}</span>
            </div>
          </div>

          <div class="terminal-container-tech animate-fade" *ngIf="selectedPanelId() === p.id">
            <div class="terminal-header-tech">
              <div class="dots-tech">
                <span class="dot-t red"></span><span class="dot-t yellow"></span><span class="dot-t green"></span>
              </div>
              <span class="terminal-title-tech">gateway_{{ p.trb_imei || 'isolated' }}_stream.log</span>
            </div>
            <div class="terminal-body-tech">
              <div class="empty-state-tech" *ngIf="filteredEvents().length === 0">
                Awaiting telemetry signals or incoming data streams for this gateway...
              </div>
              
              <div class="log-row-tech" *ngFor="let ev of filteredEvents()" [ngClass]="ev.type.toLowerCase()">
                <span class="log-time-tech">[{{ formatTime(ev.ts) }}]</span>
                <span class="log-badge-tech">{{ ev.type }}</span>
                <span class="log-data-tech">{{ ev.raw_data }}</span>
              </div>
            </div>
          </div>

        </div>

        <div class="empty-box" *ngIf="panels().length === 0">
          No safety equipment panels (ECS/CMSI) are currently assigned to your maintenance scope.
        </div>
      </div>
    </div>
  `,
  styles: [`
    .space-container { display: flex; flex-direction: column; gap: 16px; font-family: 'Inter', sans-serif; color: #e8eaf0; }
    .dashboard-header-tech { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
    .page-title { font-size: 20px; font-weight: 700; }
    .page-sub { font-size: 13px; color: #8892a4; margin-top: -8px; }
    
    .live-status-indicator { display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: rgba(90,99,120,0.1); border: 1px solid #2a3045; border-radius: 8px; font-size: 11px; color: #8892a4; font-weight: 500; }
    .live-status-indicator.active { color: #2a9d8f; background: rgba(42,157,143,0.1); border-color: rgba(42,157,143,0.2); }
    .pulse-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; animation: pulse-tech 1.6s infinite; }
    @keyframes pulse-tech { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }

    .sites-list { display: flex; flex-direction: column; gap: 14px; margin-top: 10px; max-width: 850px; }
    .panel-master-wrapper { display: flex; flex-direction: column; gap: 4px; }
    
    .site-card { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; background: #181c27; border: 1px solid #2a3045; border-radius: 14px; cursor: pointer; transition: all 0.15s; }
    .site-card:hover, .active-terminal { border-color: #457b9d; background: #1b2030; }
    
    .card-left { display: flex; align-items: flex-start; gap: 16px; }
    .building-icon { font-size: 24px; margin-top: 2px; }
    
    /* ⚡ FIX STYLE: Flexible layout config avoiding visual overlap */
    .site-name { font-size: 15px; font-weight: 600; color: #e8eaf0; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .name-txt { text-transform: capitalize; }
    
    .norme-badge-tech { font-size: 10px; font-weight: 700; background: #457b9d; color: #fff; padding: 1px 5px; border-radius: 4px; text-transform: uppercase; }
    .mono-model { font-size: 11px; font-family: 'JetBrains Mono', monospace; background: rgba(255,255,255,0.05); padding: 1px 6px; border-radius: 4px; color: #8892a4; }
    
    .site-meta { font-size: 12px; color: #8892a4; margin-top: 4px; display: flex; align-items: center; gap: 6px; }
    .mono { font-family: 'JetBrains Mono', monospace; }
    .client-lbl { font-weight: 500; }
    .separator { color: #5a6378; }

    .ssi-specs-tech-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
    .spec-pill-tech { font-size: 11px; font-weight: 500; background: #0f1117; color: #8892a4; padding: 2px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.02); }
    .spec-pill-tech.cmsi { color: #f4a261; border-color: rgba(244,162,97,0.15); background: rgba(244,162,97,0.02); }

    .card-right-tech { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
    .terminal-toggle-arrow { font-size: 11px; color: #5a6378; font-weight: 500; }
    .site-card:hover .terminal-toggle-arrow { color: #457b9d; }
    
    .status-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; }
    .status-chip .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    .status-chip.online { color: #2a9d8f; background: rgba(42,157,143,.1); border: 1px solid rgba(42,157,143,.25); }
    .status-chip.stale { color: #f4a261; background: rgba(244,162,97,.1); border: 1px solid rgba(244,162,97,.25); }
    .status-chip.offline { color: #ef4444; background: rgba(239, 68, 68, .1); border: 1px solid rgba(239, 68, 68, .25); }
    
    .empty-box { text-align: center; color: #5a6378; padding: 40px; background: #181c27; border-radius: 14px; border: 1px solid #2a3045; }

    /* 📡 Custom Console Telemetry Terminal Styling */
    .terminal-container-tech { background: #0b0d13; border: 1px solid #2a3045; border-top: none; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; padding: 14px; overflow: hidden; }
    .terminal-header-tech { display: flex; align-items: center; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.03); margin-bottom: 10px; position: relative; }
    .dots-tech { display: flex; gap: 4px; }
    .dot-t { width: 8px; height: 8px; border-radius: 50%; }
    .dot-t.red { background: #ef4444; } .dot-t.yellow { background: #f4a261; } .dot-t.green { background: #2a9d8f; }
    .terminal-title-tech { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #4b5563; position: absolute; left: 50%; transform: translateX(-50%); }
    .terminal-body-tech { max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; font-family: 'JetBrains Mono', monospace; font-size: 12px; text-align: left; }
    .empty-state-tech { color: #4b5563; font-size: 11px; padding: 10px 0; }
    .log-row-tech { display: flex; gap: 10px; padding: 4px 8px; border-radius: 4px; align-items: center; border-left: 2px solid #4b5563; background: rgba(255,255,255,0.01); }
    .log-time-tech { color: #5a6378; }
    .log-badge-tech { font-weight: bold; font-size: 10px; text-transform: uppercase; color: #fff; background: #5a6378; padding: 1px 4px; border-radius: 3px; }
    .log-data-tech { color: #d1d5db; flex: 1; }
    
    .log-row-tech.fire { border-left-color: #ef4444; background: rgba(239,68,68,0.02); }
    .log-row-tech.fire .log-badge-tech { background: #ef4444; }
    .log-row-tech.fault { border-left-color: #f4a261; background: rgba(244,162,97,0.02); }
    .log-row-tech.fault .log-badge-tech { background: #f4a261; }
    .log-row-tech.restore { border-left-color: #2a9d8f; }
    .log-row-tech.restore .log-badge-tech { background: #2a9d8f; }
    
    .animate-fade { animation: fadeIn 0.2s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class TechnicianDashboardComponent implements OnInit, OnDestroy {
  private ws?: WebSocket;
  
  panels = signal<EcsPanel[]>([]);
  events = signal<SsiEvent[]>([]);
  wsConnected = signal<boolean>(false);
  
  selectedPanelId = signal<number | null>(null);
  activeImei = signal<string | null>(null);

  filteredEvents = computed(() => {
    const imei = this.activeImei();
    if (!imei) return [];
    return this.events().filter(e => e.trb_imei === imei);
  });

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit(): void {
    this.loadPanels();
    this.connectWebSocket();
  }

  ngOnDestroy(): void {
    if (this.ws) this.ws.close();
  }

  loadPanels(): void {
    this.http.get<{ panels: EcsPanel[] }>(`${environment.apiUrl}/technician/panels`)
      .subscribe({
        next: (res) => this.panels.set(res.panels || []),
        error: (err) => console.error(err)
      });
  }

  toggleTelemetryTerminal(panel: EcsPanel): void {
    if (this.selectedPanelId() === panel.id) {
      this.selectedPanelId.set(null);
      this.activeImei.set(null);
    } else {
      this.selectedPanelId.set(panel.id);
      this.activeImei.set(panel.trb_imei);
      
      if (panel.trb_imei) {
        this.http.get<{ events: SsiEvent[] }>(`${environment.apiUrl}/events?limit=20`)
          .subscribe(res => {
            if (res.events) {
              this.events.set(res.events);
            }
          });
      }
    }
  }

  private connectWebSocket(): void {
    const token = this.auth.getToken();
    if (!token) return;

    this.ws = new WebSocket(`${environment.wsUrl}?token=${token}`);

    this.ws.onopen = () => {
      this.wsConnected.set(true);
    };

    this.ws.onmessage = (messageEvent) => {
      try {
        const data = JSON.parse(messageEvent.data);
        if (data.type === 'new_event' && data.event) {
          this.events.update(current => [data.event, ...current]);
        }
      } catch (err) {
        console.error(err);
      }
    };

    this.ws.onclose = () => {
      this.wsConnected.set(false);
      setTimeout(() => this.connectWebSocket(), 5000);
    };
  }

  formatTime(epoch: number): string {
    const date = new Date(epoch * 1000);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}