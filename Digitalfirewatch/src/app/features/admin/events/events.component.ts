// src/app/features/admin/events/events.component.ts
import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

interface SsiEvent {
  id: number;
  site_name?: string;
  type: string;
  raw_data: string;
  zone: string | null;
  ts: number;
}

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="events-page">
      <div class="events-header">
        <div>
          <h1 class="title">📡 Flux de Télémétrie Live</h1>
          <p class="subtitle">Historique et supervision temps réel des centrales SSI connectées</p>
        </div>
        <div class="status-badge" [class.online]="wsConnected()">
          <span class="pulse-dot"></span>
          {{ wsConnected() ? 'WebSocket Connected (Temps Réel)' : 'Connexion suspendue...' }}
        </div>
      </div>

      <div class="terminal-container">
        <div class="terminal-header">
          <div class="dots">
            <span class="dot red"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
          </div>
          <span class="terminal-title">logs_stream_v2.log</span>
        </div>

        <div class="terminal-body">
          <div class="empty-state" *ngIf="events().length === 0">
            Aucun événement reçu pour le moment. En attente du flux TRB...
          </div>

          <div class="log-row" *ngFor="let ev of events()" [ngClass]="ev.type.toLowerCase()">
            <span class="log-time">[{{ formatTime(ev.ts) }}]</span>
            <span class="log-badge">{{ ev.type }}</span>
            <span class="log-site">&#64;{{ ev.site_name || 'Site Inconnu' }}</span>
            <span class="log-data">{{ ev.raw_data }}</span>
            <span class="log-zone" *ngIf="ev.zone">Zone: {{ ev.zone }}</span>
            
            <!-- Bouton de suppression visible uniquement pour l'admin -->
            <button class="btn-delete-log" (click)="deleteEvent(ev.id)" title="Masquer l'événement">
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .events-page {
      padding: 32px;
      font-family: 'Inter', sans-serif;
      color: #f3f4f6;
    }

    .events-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 28px;
    }

    .title {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #f3f4f6;
    }

    .subtitle {
      font-size: 13px;
      color: #9ca3af;
      margin-top: 4px;
    }

    /* Status Badge Pulsing */
    .status-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: #ef4444;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
    }

    .status-badge.online {
      background: rgba(16, 185, 129, 0.1);
      border-color: rgba(16, 185, 129, 0.2);
      color: #10b981;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      background: currentColor;
      border-radius: 50%;
      animation: pulse 1.6s infinite;
    }

    /* Terminal Interface Style */
    .terminal-container {
      background: #0f111a;
      border: 1px solid #1e2235;
      border-radius: 16px;
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.5);
      overflow: hidden;
    }

    .terminal-header {
      background: #151824;
      padding: 12px 18px;
      display: flex;
      align-items: center;
      border-bottom: 1px solid #1e2235;
      position: relative;
    }

    .dots { display: flex; gap: 6px; }
    .dot { width: 10px; height: 10px; border-radius: 50%; }
    .dot.red { background: #ef4444; }
    .dot.yellow { background: #f59e0b; }
    .dot.green { background: #10b981; }

    .terminal-title {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #4b5563;
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
    }

    .terminal-body {
      padding: 20px;
      max-height: 65vh;
      overflow-y: auto;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .empty-state {
      text-align: center;
      color: #4b5563;
      padding: 40px 0;
    }

    /* Log Rows Styling according to type */
    .log-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      padding: 6px 10px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.02);
      transition: background 0.15s;
    }
    .log-row:hover { background: rgba(255, 255, 255, 0.05); }

    .log-time { color: #6b7280; }
    .log-site { color: #3b82f6; font-weight: 500; }
    .log-data { color: #e5e7eb; flex: 1; }
    .log-zone { color: #9ca3af; background: #1e2235; padding: 2px 6px; border-radius: 4px; font-size: 11px; }

    .log-badge {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      background: #4b5563;
      color: #fff;
    }

    /* Bouton supprimer style mini terminal-icon */
    .btn-delete-log {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 13px;
      opacity: 0;
      padding: 2px 6px;
      border-radius: 4px;
      transition: all 0.15s;
    }
    .log-row:hover .btn-delete-log {
      opacity: 0.6;
    }
    .btn-delete-log:hover {
      opacity: 1 !important;
      background: rgba(239, 68, 68, 0.2);
    }

    /* Colors by Event Level */
    .fire .log-badge { background: #ef4444; box-shadow: 0 0 8px rgba(239, 68, 68, 0.4); }
    .fire { background: rgba(239, 68, 68, 0.05); border-left: 3px solid #ef4444; }

    .fault .log-badge { background: #f59e0b; }
    .fault { background: rgba(245, 158, 11, 0.05); border-left: 3px solid #f59e0b; }

    .restore .log-badge { background: #10b981; }
    .restore { border-left: 3px solid #10b981; }

    .test .log-badge { background: #6366f1; }

    @keyframes pulse {
      0% { opacity: 0.4; }
      50% { opacity: 1; }
      100% { opacity: 0.4; }
    }
  `]
})
export class EventsComponent implements OnInit, OnDestroy {
  private ws?: WebSocket;
  
  // Signals d'état réactifs
  events = signal<SsiEvent[]>([]);
  wsConnected = signal<boolean>(false);

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit(): void {
    // 1. Jb d-départ men l-API HTTP (les 50 derniers events)
    this.fetchInitialEvents();

    // 2. 7el l-WebSocket m3a passation dyal token f query params
    this.connectWebSocket();
  }

  ngOnDestroy(): void {
    if (this.ws) this.ws.close();
  }

  private fetchInitialEvents(): void {
    this.http.get<{ events: SsiEvent[] }>(`${environment.apiUrl}/events?limit=50`)
      .subscribe({
        next: (res) => this.events.set(res.events || []),
        error: (err) => console.error('Erreur historique events:', err)
      });
  }

  private connectWebSocket(): void {
    const token = this.auth.getToken();
    if (!token) return;

    this.ws = new WebSocket(`${environment.wsUrl}?token=${token}`);

    this.ws.onopen = () => {
      this.wsConnected.set(true);
      console.log('[WS] Connecté au serveur DigiFireWatch');
    };

    this.ws.onmessage = (messageEvent) => {
      try {
        const data = JSON.parse(messageEvent.data);
        
        if (data.type === 'new_event' && data.event) {
          this.events.update(current => [data.event, ...current]);
        }
      } catch (err) {
        console.error('Erreur parsing message WS:', err);
      }
    };

    this.ws.onclose = () => {
      this.wsConnected.set(false);
      console.log('[WS] Déconnecté. Tentative de reconconnexion dans 5s...');
      setTimeout(() => this.connectWebSocket(), 5000);
    };

    this.ws.onerror = (error) => {
      console.error('[WS] Erreur détectée:', error);
    };
  }

  // 🗑️ DELETE synchrone avec le Soft-delete du Backend
  deleteEvent(id: number): void {
    if (confirm('Masquer cet événement de la télémétrie ? (L’opération sera enregistrée dans l’audit log)')) {
      this.http.delete(`${environment.apiUrl}/events/${id}`)
        .subscribe({
          next: () => {
            // Filtrage dynamique immédiat via le signal
            this.events.update(current => current.filter(e => e.id !== id));
            console.log(`[CRUD] Event ${id} soft-deleted.`);
          },
          error: (err) => console.error('Erreur lors du masquage de l’événement:', err)
        });
    }
  }

  formatTime(epoch: number): string {
    const date = new Date(epoch * 1000);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}