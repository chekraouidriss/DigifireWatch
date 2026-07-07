// src/app/features/admin/clients/clients.component.ts
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';

interface Client {
  id: number;
  company_name: string;
  hq_address: string | null;
  city: string | null;
  dir_securite_name: string; dir_securite_phone: string; dir_securite_email: string;
  dir_technique_name: string; dir_technique_phone: string; dir_technique_email: string;
  adj_technique_name: string; adj_technique_phone: string; adj_technique_email: string;
}

interface EcsPanel {
  id: number; client_id: number; panel_name: string; panel_model: string;
  trb_imei: string | null; ref_broudi: string | null;
  niveau_securite: string | null; lignes_detection: string | null;
  resume_installation: string | null; location_details: string;
  gw_status?: string;
}

interface AvailableTrb { imei: string; trb_id: string; status: string; }

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="clients-container">
      <div class="page-header">
        <div>
          <h1 class="title">🏢 Supervision Single-Page (Maison Mère & Centrales ECS)</h1>
          <p class="subtitle">Gestion globale des entités juridiques, contacts de sécurité et appairage des modems TRB</p>
        </div>
        <button class="btn-primary" (click)="openClientModal()">＋ Ajouter une Entreprise</button>
      </div>

      <div class="search-container-wrap">
        <div class="search-wrap-input">
          <span class="search-icon-lens">🔍</span>
          <input 
            type="text" 
            [value]="searchTerm()" 
            (input)="onSearchChange($event)"
            placeholder="Rechercher par raison sociale, ville, adresse ou contact responsable..." 
            class="search-input-field"
          />
          <button *ngIf="searchTerm()" class="btn-clear-search" (click)="clearSearch()">×</button>
        </div>
      </div>

      <div class="clients-grid">
        <div class="empty-state" *ngIf="filteredClients().length === 0">
          {{ searchTerm() ? 'Aucune entreprise ne correspond à votre recherche.' : 'Aucune société trouvée.' }}
        </div>

        <div class="client-master-card" *ngFor="let c of filteredClients()">
          <div class="client-main-row" (click)="toggleClientPanels(c.id)">
            <div class="card-left">
              <div class="client-avatar">{{ c.company_name[0].toUpperCase() }}</div>
              <div class="client-info">
                <span class="client-name">{{ c.company_name }}</span>
                <span class="client-city">📍 {{ c.hq_address || 'Non spécifié' }}, {{ c.city || 'Maroc' }}</span>
              </div>
            </div>
            
            <div class="contacts-summary-preview">
              <div class="mini-contact-pill">🛡️ Sec: {{ c.dir_securite_name }}</div>
              <div class="mini-contact-pill">⚙️ Tech: {{ c.dir_technique_name }}</div>
            </div>

            <div class="card-actions" (click)="$event.stopPropagation()">
              <button class="btn-panel-toggle" (click)="toggleClientPanels(c.id)">
                {{ selectedClientId() === c.id ? '🔼 Masquer' : '🔽 Centrales ECS / SSI' }}
              </button>
              <button class="btn-delete" (click)="deleteClient(c.id)">🗑️</button>
            </div>
          </div>

          <div class="client-panels-accordion" *ngIf="selectedClientId() === c.id">
            <div class="accordion-header">
              <h4>📋 Inventaire des Équipements de Sécurité (ECS)</h4>
              <button class="btn-secondary small" (click)="openPanelModal(c.id)">＋ Créer un Panel ECS (SSI)</button>
            </div>

            <div class="empty-state" *ngIf="panels().length === 0">Aucun panel ECS installé pour ce client.</div>

            <div class="panels-list" *ngIf="panels().length > 0">
              <div class="panel-item-card" *ngFor="let p of panels()">
                <div class="panel-meta-info">
                  <span class="p-name">
                    {{ p.panel_name }} <small class="mono-badge">{{ p.panel_model }}</small>
                    <button class="btn-delete-mini" (click)="deletePanel(p)" title="Supprimer définitivement cette centrale ECS">🗑️</button>
                  </span>
                  <span class="p-summary">🔧 <strong>Specs:</strong> {{ p.resume_installation || 'Non spécifié' }} | 🗺️ {{ p.location_details }}</span>
                  <span class="p-security-lines">🛡️ <strong>NS:</strong> {{ p.niveau_securite || 'N/A' }} | <strong>LN:</strong> {{ p.lignes_detection || 'N/A' }} | <strong>Ref:</strong> {{ p.ref_broudi || 'N/A' }}</span>
                </div>

                <div class="panel-trb-binding">
                  <div class="binding-status" *ngIf="p.trb_imei">
                    <span class="status-chip online"><span class="dot"></span>Linked IMEI: {{ p.trb_imei }}</span>
                    <button class="btn-danger small" (click)="removeTrb(p)">Dissocier</button>
                  </div>
                  <div class="binding-action" *ngIf="!p.trb_imei">
                    <select class="field-select small-select" #trbSelect>
                      <option value="">— Associer une TRB (IMEI) —</option>
                      <option *ngFor="let t of availableTrbs()" [value]="t.imei">
                        {{ t.trb_id }} [{{ t.imei }}]
                      </option>
                    </select>
                    <button class="btn-primary small" (click)="assignTrb(p, trbSelect.value)">Lier</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-overlay" *ngIf="isClientModalOpen()">
        <div class="modal-card wide-modal">
          <div class="modal-header">
            <h3>Créer un Profil Entreprise (Maison Mère)</h3>
            <button class="btn-close" (click)="closeClientModal()">×</button>
          </div>
          <form (ngSubmit)="createClient()" #clientForm="ngForm">
            <div class="form-body grid-form">
              <div class="form-group full-width">
                <label>Raison Sociale / Maison Mère *</label>
                <input type="text" [(ngModel)]="newClient.company_name" name="company_name" required placeholder="Ex: Marriott Hotels Maroc">
              </div>
              <div class="form-group">
                <label>Adresse du Siège</label>
                <input type="text" [(ngModel)]="newClient.hq_address" name="hq_address" placeholder="Ex: Boulevard de la Corniche">
              </div>
              <div class="form-group">
                <label>Ville</label>
                <input type="text" [(ngModel)]="newClient.city" name="city" placeholder="Ex: Casablanca">
              </div>

              <div class="contact-section-title">🛡️ Directeur Sécurité (Obligatoire)</div>
              <div class="form-group"><label>Nom complet *</label><input type="text" [(ngModel)]="newClient.dir_securite_name" name="ds_n" required></div>
              <div class="form-group"><label>Téléphone *</label><input type="text" [(ngModel)]="newClient.dir_securite_phone" name="ds_p" required></div>
              <div class="form-group full-width"><label>Email <span class="optional-tag">(Facultatif)</span></label><input type="email" [(ngModel)]="newClient.dir_securite_email" name="ds_e"></div>

              <div class="contact-section-title">⚙️ Directeur Technique (Obligatoire)</div>
              <div class="form-group"><label>Nom complet *</label><input type="text" [(ngModel)]="newClient.dir_technique_name" name="dt_n" required></div>
              <div class="form-group"><label>Téléphone *</label><input type="text" [(ngModel)]="newClient.dir_technique_phone" name="dt_p" required></div>
              <div class="form-group full-width"><label>Email <span class="optional-tag">(Facultatif)</span></label><input type="email" [(ngModel)]="newClient.dir_technique_email" name="dt_e"></div>

              <div class="contact-section-title">🤝 Adjoint Directeur Technique (Obligatoire)</div>
              <div class="form-group"><label>Nom complet *</label><input type="text" [(ngModel)]="newClient.adj_technique_name" name="dat_n" required></div>
              <div class="form-group"><label>Téléphone *</label><input type="text" [(ngModel)]="newClient.adj_technique_phone" name="dat_p" required></div>
              <div class="form-group full-width"><label>Email <span class="optional-tag">(Facultatif)</span></label><input type="email" [(ngModel)]="newClient.adj_technique_email" name="dat_e"></div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" (click)="closeClientModal()">Annuler</button>
              <button type="submit" class="btn-submit" [disabled]="!clientForm.form.valid">Enregistrer le Client</button>
            </div>
          </form>
        </div>
      </div>

      <div class="modal-overlay" *ngIf="isPanelModalOpen()">
        <div class="modal-card">
          <div class="modal-header">
            <h3>Nouveau Panneau de Détection (ECS / SSI)</h3>
            <button class="btn-close" (click)="closePanelModal()">×</button>
          </div>
          <form (ngSubmit)="createPanel()" #panelForm="ngForm">
            <div class="form-body">
              <div class="form-group">
                <label>Nom du Panneau / Identifiant Interne *</label>
                <input type="text" [(ngModel)]="newPanel.panel_name" name="p_name" required placeholder="Ex: Central Bloc B Cuisine">
              </div>
              <div class="form-group">
                <label>Modèle de la Centrale (Constructeur) *</label>
                <input type="text" [(ngModel)]="newPanel.panel_model" name="p_model" required placeholder="Ex: Baltic S12 ou Esser IQ8">
              </div>
              <div class="form-group">
                <label>Référence Technique (Broudi/Chubb)</label>
                <input type="text" [(ngModel)]="newPanel.ref_broudi" name="p_ref" placeholder="Ex: NS-LN-992">
              </div>
              <div class="form-group">
                <label>Niveau de Sécurité (NS)</label>
                <input type="text" [(ngModel)]="newPanel.niveau_securite" name="p_ns" placeholder="Ex: Catégorie A">
              </div>
              <div class="form-group">
                <label>Lignes / Boucles de détection (LN)</label>
                <input type="text" [(ngModel)]="newPanel.lignes_detection" name="p_ln" placeholder="Ex: 4 Lignes de Boucle">
              </div>
              <div class="form-group">
                <label>Résumé de l'installation matériel</label>
                <input type="text" [(ngModel)]="newPanel.resume_installation" name="p_res" placeholder="Ex: ym:50 DI, 200 DM, 1 SIM">
              </div>
              <div class="form-group">
                <label>Localisation précise dans le bâtiment *</label>
                <input type="text" [(ngModel)]="newPanel.location_details" name="p_loc" required placeholder="Ex: Local Technique RDC, Aile Nord">
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" (click)="closePanelModal()">Annuler</button>
              <button type="submit" class="btn-submit" [disabled]="!panelForm.form.valid">Installer l'ECS</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .clients-container { padding: 32px; font-family: 'Inter', sans-serif; color: #f3f4f6; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .title { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
    .subtitle { font-size: 13px; color: #9ca3af; margin-top: 4px; }

    /* 🔍 Design System Barre de recherche unifiée */
    .search-container-wrap { margin-bottom: 24px; max-width: 900px; width: 100%; }
    .search-wrap-input { display: flex; align-items: center; gap: 10px; background: #181c27; border: 1px solid #2a3045; border-radius: 12px; padding: 10px 16px; transition: border-color 0.2s; position: relative; }
    .search-wrap-input:focus-within { border-color: #e63946; }
    .search-icon-lens { font-size: 14px; color: #8892a4; }
    .search-input-field { background: transparent; border: none; outline: none; width: 100%; color: #fff; font-size: 14px; font-family: 'Inter', sans-serif; padding-right: 24px; }
    .search-input-field::placeholder { color: #5a6378; }
    .btn-clear-search { background: transparent; border: none; color: #8892a4; font-size: 18px; cursor: pointer; position: absolute; right: 16px; top: 50%; transform: translateY(-50%); padding: 0; line-height: 1; }
    .btn-clear-search:hover { color: #fff; }

    .btn-primary { background: #e63946; color: #fff; border: none; padding: 10px 18px; border-radius: 10px; font-weight: 600; cursor: pointer; }
    .btn-primary:hover { opacity: 0.9; }
    .btn-secondary { background: none; border: 1px solid #2a3045; color: #8892a4; padding: 8px 16px; border-radius: 8px; cursor: pointer; }
    .btn-secondary:hover { border-color: #8892a4; color: #fff; }
    .btn-danger { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444; border-radius: 6px; cursor: pointer; }
    .btn-danger:hover { background: rgba(239, 68, 68, 0.2); }
    .small { padding: 4px 8px; font-size: 11px; }

    .clients-grid { display: flex; flex-direction: column; gap: 16px; width: 100%; max-width: 900px; }
    .client-master-card { background: #181c27; border: 1px solid #2a3045; border-radius: 14px; overflow: hidden; }
    .client-main-row { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; cursor: pointer; transition: background 0.2s; }
    .client-main-row:hover { background: #1e2333; }
    
    .card-left { display: flex; align-items: center; gap: 14px; }
    .client-avatar { width: 44px; height: 44px; border-radius: 50%; background: #e63946; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; flex-shrink: 0; }
    .client-name { display: block; font-size: 16px; font-weight: 600; }
    .client-city { display: block; font-size: 12px; color: #8892a4; margin-top: 2px; }
    
    .contacts-summary-preview { display: flex; gap: 8px; }
    .mini-contact-pill { font-size: 11px; background: #0f1117; padding: 4px 8px; border-radius: 6px; color: #9ca3af; border: 1px solid #2a3045; }
    
    .card-actions { display: flex; align-items: center; gap: 10px; }
    .btn-panel-toggle { background: #2a3045; border: none; color: #fff; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 500; cursor: pointer; }
    .btn-delete { background: none; border: none; cursor: pointer; font-size: 16px; }

    .client-panels-accordion { background: #0f1117; padding: 20px; border-top: 1px solid #2a3045; border-bottom-left-radius: 14px; border-bottom-right-radius: 14px; }
    .accordion-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px dashed #2a3045; padding-bottom: 8px; }
    .accordion-header h4 { font-size: 13px; color: #8892a4; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    
    .panels-list { display: flex; flex-direction: column; gap: 10px; }
    .panel-item-card { display: flex; justify-content: space-between; align-items: center; background: #181c27; border: 1px solid #2a3045; border-radius: 10px; padding: 12px 16px; }
    .panel-meta-info { display: flex; flex-direction: column; gap: 4px; text-align: left; }
    .p-name { font-size: 14px; font-weight: 600; color: #fff; display: flex; align-items: center; gap: 8px; }
    .mono-badge { font-family: 'JetBrains Mono', monospace; font-size: 11px; background: #e63946; color: #fff; padding: 1px 6px; border-radius: 4px; }
    .p-summary { font-size: 12px; color: #9ca3af; }
    .p-security-lines { font-size: 11px; color: #6b7280; }

    .btn-delete-mini { background: transparent; border: none; cursor: pointer; font-size: 12px; padding: 2px 6px; border-radius: 4px; transition: background 0.2s; margin-left: 4px; }
    .btn-delete-mini:hover { background: rgba(239, 68, 68, 0.2); }

    .panel-trb-binding { display: flex; align-items: center; gap: 10px; }
    .binding-status { display: flex; align-items: center; gap: 8px; }
    .status-chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-family: 'JetBrains Mono', monospace; font-weight: 600; }
    .status-chip.online { color: #2a9d8f; background: rgba(42,157,143,0.1); border: 1px solid rgba(42,157,143,0.2); }
    .status-chip .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

    .field-select { background: #0f1117; border: 1px solid #2a3045; border-radius: 6px; color: #fff; padding: 6px 10px; font-size: 12px; outline: none; }
    .small-select { width: 220px; }

    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 999; }
    .modal-card { background: #1e2333; border: 1px solid #2a3045; border-radius: 16px; width: 100%; max-width: 460px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .wide-modal { max-width: 650px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #2a3045; }
    .btn-close { background: none; border: none; color: #8892a4; font-size: 24px; cursor: pointer; }
    .form-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; text-align: left; }
    .grid-form { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; max-height: 75vh; overflow-y: auto; }
    .full-width { grid-column: span 2; }
    .contact-section-title { grid-column: span 2; font-size: 12px; font-weight: 700; color: #e63946; text-transform: uppercase; border-bottom: 1px solid #2a3045; padding-top: 10px; padding-bottom: 4px; }
    .optional-tag { font-size: 10px; color: #8892a4; font-weight: 400; text-transform: lowercase; }
    .form-group { display: flex; flex-direction: column; gap: 4px; }
    .form-group label { font-size: 11px; color: #8892a4; }
    .form-group input { background: #181c27; border: 1px solid #2a3045; border-radius: 8px; padding: 9px; color: #fff; font-size: 13px; }
    .form-group input:focus { border-color: #e63946; outline: none; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 20px; border-top: 1px solid #2a3045; background: #151824; }
    .btn-submit { background: #e63946; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .empty-state { color: #6b7280; font-size: 12px; text-align: center; padding: 20px; }
  `]
})
export class ClientsComponent implements OnInit {
  clients = signal<Client[]>([]);
  panels = signal<EcsPanel[]>([]);
  availableTrbs = signal<AvailableTrb[]>([]);

  selectedClientId = signal<number | null>(null);
  isClientModalOpen = signal<boolean>(false);
  isPanelModalOpen = signal<boolean>(false);

  // ⚡ NOUVEAU: Signal de recherche unifié
  searchTerm = signal<string>('');

  // ⚡ NOUVEAU: Signal computed pour filtrer à la volée sur le client-side
  filteredClients = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    if (!query) return this.clients();

    return this.clients().filter(c => {
      const matchCompany = c.company_name.toLowerCase().includes(query);
      const matchAddress = (c.hq_address || '').toLowerCase().includes(query);
      const matchCity    = (c.city || '').toLowerCase().includes(query);
      
      // Recherche transverse également sur les noms des directeurs/contacts responsables
      const matchSec     = c.dir_securite_name.toLowerCase().includes(query);
      const matchTech    = c.dir_technique_name.toLowerCase().includes(query);
      const matchAdj     = c.adj_technique_name.toLowerCase().includes(query);

      return matchCompany || matchAddress || matchCity || matchSec || matchTech || matchAdj;
    });
  });

  newClient = {
    company_name: '', hq_address: '', city: '',
    dir_securite_name: '', dir_securite_phone: '', dir_securite_email: '',
    dir_technique_name: '', dir_technique_phone: '', dir_technique_email: '',
    adj_technique_name: '', adj_technique_phone: '', adj_technique_email: ''
  };

  newPanel = {
    panel_name: '', panel_model: '', ref_broudi: '',
    niveau_securite: '', lignes_detection: '', resume_installation: '', location_details: ''
  };

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadClients();
    this.loadAvailableTrbs();
  }

  onSearchChange(event: Event): void {
    const inputVal = (event.target as HTMLInputElement).value;
    this.searchTerm.set(inputVal);
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  loadClients(): void {
    this.http.get<{ clients: Client[] }>(`${environment.apiUrl}/admin/clients`)
      .subscribe(res => this.clients.set(res.clients || []));
  }

  loadAvailableTrbs(): void {
    this.http.get<{ devices: AvailableTrb[] }>(`${environment.apiUrl}/admin/trb-devices`)
      .subscribe(res => {
        this.availableTrbs.set((res.devices || []).filter(d => d.status !== 'claimed'));
      });
  }

  toggleClientPanels(clientId: number): void {
    if (this.selectedClientId() === clientId) {
      this.selectedClientId.set(null);
      this.panels.set([]);
    } else {
      this.selectedClientId.set(clientId);
      this.loadClientPanels(clientId);
    }
  }

  loadClientPanels(clientId: number): void {
    this.http.get<{ panels: EcsPanel[] }>(`${environment.apiUrl}/admin/ecs-panels?client_id=${clientId}`)
      .subscribe(res => this.panels.set(res.panels || []));
  }

  createClient(): void {
    const payload = {
      ...this.newClient,
      dir_securite_email: this.newClient.dir_securite_email?.trim() || '',
      dir_technique_email: this.newClient.dir_technique_email?.trim() || '',
      adj_technique_email: this.newClient.adj_technique_email?.trim() || ''
    };

    this.http.post(`${environment.apiUrl}/admin/clients`, payload)
      .subscribe({
        next: () => {
          this.loadClients();
          this.closeClientModal();
        },
        error: (err) => console.error(err)
      });
  }

  createPanel(): void {
    const cid = this.selectedClientId();
    if (!cid) return;

    const payload = { ...this.newPanel, client_id: cid };
    this.http.post(`${environment.apiUrl}/admin/ecs-panels`, payload)
      .subscribe({
        next: () => {
          this.loadClientPanels(cid);
          this.closePanelModal();
        },
        error: (err) => console.error(err)
      });
  }

  deletePanel(panel: EcsPanel): void {
    if (!confirm(`Voulez-vous vraiment supprimer définitivement la centrale « ${panel.panel_name} » ?`)) return;
    
    this.http.delete(`${environment.apiUrl}/admin/ecs-panels/${panel.id}`)
      .subscribe({
        next: () => {
          this.loadClientPanels(panel.client_id);
          this.loadAvailableTrbs();
        },
        error: (err) => alert(err.error?.message || 'Erreur lors de la suppression du panel.')
      });
  }

  assignTrb(panel: EcsPanel, imei: string): void {
    if (!imei) return;
    this.http.put(`${environment.apiUrl}/admin/ecs-panels/${panel.id}/assign-trb`, { trb_imei: imei })
      .subscribe({
        next: () => {
          this.loadClientPanels(panel.client_id);
          this.loadAvailableTrbs();
        },
        error: (err) => console.error(err)
      });
  }

  removeTrb(panel: EcsPanel): void {
    if (!confirm('Voulez-vous dissocier ce modem TRB de cette centrale ?')) return;
    this.http.put(`${environment.apiUrl}/admin/ecs-panels/${panel.id}/remove-trb`, {})
      .subscribe({
        next: () => {
          this.loadClientPanels(panel.client_id);
          this.loadAvailableTrbs();
        },
        error: (err) => console.error(err)
      });
  }

  deleteClient(id: number): void {
    if (!confirm('Supprimer cette entreprise définitivement ?')) return;
    this.http.delete(`${environment.apiUrl}/admin/clients/${id}`)
      .subscribe({
        next: () => this.loadClients(),
        error: (err) => alert(err.error?.message || 'Erreur suppression. Assurez-vous que vous avez supprimé toutes ses centrales ECS.')
      });
  }

  openClientModal(): void {
    this.newClient = {
      company_name: '', hq_address: '', city: '',
      dir_securite_name: '', dir_securite_phone: '', dir_securite_email: '',
      dir_technique_name: '', dir_technique_phone: '', dir_technique_email: '',
      adj_technique_name: '', adj_technique_phone: '', adj_technique_email: ''
    };
    this.isClientModalOpen.set(true);
  }
  closeClientModal(): void { this.isClientModalOpen.set(false); }
  openPanelModal(clientId: number): void { this.isPanelModalOpen.set(true); }
  closePanelModal(): void { this.isPanelModalOpen.set(false); }
}