// src/app/features/admin/events/events.component.ts
import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms'; // <-- Importation indispensable pour la barre de recherche
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

interface SsiEvent {
  id: number;
  trb_imei: string;
  ecs_panel_id: number | null;
  client_id: number | null;
  client_name?: string; // Nom de la Maison Mère
  panel_name?: string;  // Nom de la centrale ECS (SSI)
  type: string;         // FIRE, RESTORE, FAULT
  raw_data: string;     // Texte brut du panneau
  ts: number;           // Epoch timestamp d'origine
}

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, FormsModule], // <-- Ajout de FormsModule ici
  template: `
    <div class="events-page">
      <div class="events-header">
        <div>
          <h1 class="title">📡 Flux de Télémétrie Live</h1>
          <p class="subtitle">Historique et journalisation centralisée des événements (Table Unifiée)</p>
        </div>
        <div class="status-badge" [class.online]="wsConnected()">
          <span class="pulse-dot"></span>
          {{ wsConnected() ? 'WebSocket Connected (Temps Réel)' : 'Connexion suspendue...' }}
        </div>
      </div>

      <div class="search-container-wrap">
        <div class="search-wrap-input">
          <span class="search-icon-lens">🔍</span>
          <input 
            type="text" 
            [value]="searchTerm()" 
            (input)="onSearchChange($event)"
            placeholder="Filtrer par type (FIRE, FAULT), entreprise, centrale, message brut ou IMEI..." 
            class="search-input-field"
          />
          <button *ngIf="searchTerm()" class="btn-clear-search" (click)="clearSearch()">×</button>
        </div>
      </div>

      <div class="terminal-container">
        <div class="terminal-header">
          <div class="dots">
            <span class="dot red"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
          </div>
          <span class="terminal-title">all_gateways_events.log</span>
        </div>

        <div class="terminal-body">
          <div class="empty-state" *ngIf="filteredEvents().length === 0">
            {{ searchTerm() ? 'Aucun événement ne correspond à votre recherche.' : 'Aucun événement reçu pour le moment. En attente du flux des passerelles TRB...' }}
          </div>

          <div class="log-row" *ngFor="let ev of filteredEvents()" [ngClass]="ev.type.toLowerCase()">
            <span class="log-time">[{{ formatTime(ev.ts) }}]</span>
            <span class="log-badge">{{ ev.type }}</span>
            
            <span class="log-site">
              &#64;{{ ev.client_name || 'Rogue / Non Associé' }} 
              <span class="routing-arrow">➔</span> 
              ({{ ev.panel_name || 'Flux Non Routé' }})
            </span>
            
            <span class="log-data">{{ ev.raw_data }}</span>
            <span class="log-zone">IMEI: {{ ev.trb_imei }}</span>
            
            <button class="btn-delete-log" (click)="deleteEvent(ev.id)" title="Masquer l'événement de l'audit log">
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .events-page { padding: 32px; font-family: 'Inter', sans-serif; color: #f3f4f6; }
    .events-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .title { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; color: #f3f4f6; }
    .subtitle { font-size: 13px; color: #9ca3af; margin-top: 4px; }

    /* 🔍 Design Intégré de la Barre de recherche */
    .search-container-wrap { margin-bottom: 24px; width: 100%; }
    .search-wrap-input { display: flex; align-items: center; gap: 10px; background: #151824; border: 1px solid #1e2235; border-radius: 12px; padding: 11px 16px; transition: border-color 0.2s; position: relative; }
    .search-wrap-input:focus-within { border-color: #ef4444; }
    .search-icon-lens { font-size: 14px; color: #4b5563; }
    .search-input-field { background: transparent; border: none; outline: none; width: 100%; color: #fff; font-size: 14px; font-family: 'Inter', sans-serif; padding-right: 24px; }
    .search-input-field::placeholder { color: #4b5563; }
    .btn-clear-search { background: transparent; border: none; color: #8892a4; font-size: 18px; cursor: pointer; position: absolute; right: 16px; top: 50%; transform: translateY(-50%); padding: 0; line-height: 1; }
    .btn-clear-search:hover { color: #fff; }

    .status-badge { display: flex; align-items: center; gap: 8px; padding: 8px 14px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444; border-radius: 10px; font-size: 12px; font-weight: 600; }
    .status-badge.online { background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.2); color: #10b981; }
    .pulse-dot { width: 8px; height: 8px; background: currentColor; border-radius: 50%; animation: pulse 1.6s infinite; }
    .terminal-container { background: #0f111a; border: 1px solid #1e2235; border-radius: 16px; box-shadow: 0 12px 24px rgba(0, 0, 0, 0.5); overflow: hidden; }
    .terminal-header { background: #151824; padding: 12px 18px; display: flex; align-items: center; border-bottom: 1px solid #1e2235; position: relative; }
    .dots { display: flex; gap: 6px; }
    .dot { width: 10px; height: 10px; border-radius: 50%; }
    .dot.red { background: #ef4444; }
    .dot.yellow { background: #f59e0b; }
    .dot.green { background: #10b981; }
    .terminal-title { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #4b5563; position: absolute; left: 50%; transform: translateX(-50%); }
    .terminal-body { padding: 20px; max-height: 60vh; overflow-y: auto; font-family: 'JetBrains Mono', monospace; font-size: 13px; display: flex; flex-direction: column; gap: 10px; }
    .empty-state { text-align: center; color: #4b5563; padding: 40px 0; }
    .log-row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 8px 12px; border-radius: 6px; background: rgba(255, 255, 255, 0.01); border-left: 3px solid #4b5563; transition: background 0.15s; }
    .log-row:hover { background: rgba(255, 255, 255, 0.04); }
    .log-time { color: #6b7280; }
    .log-site { color: #3b82f6; font-weight: 500; }
    .routing-arrow { color: #8892a4; margin: 0 2px; }
    .log-data { color: #e5e7eb; flex: 1; text-align: left; }
    .log-zone { color: #8892a4; background: #1e2235; padding: 2px 6px; border-radius: 4px; font-size: 11px; }
    .log-badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: #4b5563; color: #fff; }
    .btn-delete-log { background: none; border: none; cursor: pointer; font-size: 13px; opacity: 0; padding: 2px 6px; border-radius: 4px; transition: all 0.15s; }
    .log-row:hover .btn-delete-log { opacity: 0.6; }
    .btn-delete-log:hover { opacity: 1 !important; background: rgba(239, 68, 68, 0.2); }
    .fire .log-badge { background: #ef4444; box-shadow: 0 0 8px rgba(239, 68, 68, 0.4); }
    .fire { background: rgba(239, 68, 68, 0.03); border-left-color: #ef4444; }
    .fault .log-badge { background: #f59e0b; }
    .fault { background: rgba(245, 158, 11, 0.03); border-left-color: #f59e0b; }
    .restore .log-badge { background: #10b981; }
    .restore { border-left-color: #10b981; }
    @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
  `]
})
export class EventsComponent implements OnInit, OnDestroy {
  private ws?: WebSocket;
  
  events = signal<SsiEvent[]>([]);
  wsConnected = signal<boolean>(false);

  // ⚡ NOUVEAU: Signal réactif de filtrage live
  searchTerm = signal<string>('');

  // ⚡ NOUVEAU: Computed Signal ultra-rapide connecté au flux
  filteredEvents = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    if (!query) return this.events();

    return this.events().filter(ev => {
      const matchType   = ev.type.toLowerCase().includes(query);
      const matchClient = (ev.client_name || 'rogue / non associé').toLowerCase().includes(query);
      const matchPanel  = (ev.panel_name  || 'flux non routé').toLowerCase().includes(query);
      const matchRaw    = ev.raw_data.toLowerCase().includes(query);
      const matchImei   = ev.trb_imei.toLowerCase().includes(query);

      return matchType || matchClient || matchPanel || matchRaw || matchImei;
    });
  });

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit(): void {
    this.fetchInitialEvents();
    this.connectWebSocket();
  }

  ngOnDestroy(): void {
    if (this.ws) this.ws.close();
  }

  // Hydrater le signal à chaque frappe clavier
  onSearchChange(event: Event): void {
    const inputVal = (event.target as HTMLInputElement).value;
    this.searchTerm.set(inputVal);
  }

  // Vider le filtre instantanément
  clearSearch(): void {
    this.searchTerm.set('');
  }

  private fetchInitialEvents(): void {
    this.http.get<{ events: SsiEvent[] }>(`${environment.apiUrl}/events?limit=100`)
      .subscribe({
        next: (res) => this.events.set(res.events || []),
        error: (err) => console.error('Erreur historique logs unifiés:', err)
      });
  }

  private connectWebSocket(): void {
    const token = this.auth.getToken();
    if (!token) return;

    this.ws = new WebSocket(`${environment.wsUrl}?token=${token}`);

    this.ws.onopen = () => {
      this.wsConnected.set(true);
      console.log('[WS] Connecté au journal unifié DigiFireWatch');
    };

    this.ws.onmessage = (messageEvent) => {
      try {
        const data = JSON.parse(messageEvent.data);
        if (data.type === 'new_event' && data.event) {
          this.events.update(current => [data.event, ...current]);
        }
      } catch (err) {
        console.error('Erreur parsing log WS:', err);
      }
    };

    this.ws.onclose = () => {
      this.wsConnected.set(false);
      setTimeout(() => this.connectWebSocket(), 5000);
    };

    this.ws.onerror = (error) => console.error('[WS] Erreur Télémétrie:', error);
  }

  deleteEvent(id: number): void {
    if (confirm('Masquer cet événement du journal de sécurité ? (L’opération sera enregistrée dans l’audit log)')) {
      this.http.delete(`${environment.apiUrl}/events/${id}`)
        .subscribe({
          next: () => {
            this.events.update(current => current.filter(e => e.id !== id));
            console.log(`[Journal] Record ${id} soft-deleted safely.`);
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