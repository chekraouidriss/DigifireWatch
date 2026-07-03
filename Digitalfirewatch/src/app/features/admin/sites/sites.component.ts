// src/app/features/admin/sites/sites.component.ts
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';

interface Client { id: number; name: string; }
interface Site {
  id: number;
  client_id: number | null;
  client_name?: string;
  name: string;
  city: string | null;
}

@Component({
  selector: 'app-sites',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="sites-container">
      <div class="page-header">
        <div>
          <h1 class="title">🏢 Gestion des Sites (Bâtiments)</h1>
          <p class="subtitle">Supervisez les établissements et associez-les aux entités clients</p>
        </div>
        <button class="btn-primary" (click)="openModal()">＋ Ajouter un site</button>
      </div>

      <!-- Liste des Sites -->
      <div class="sites-grid">
        <div class="empty-state" *ngIf="sites().length === 0">
          Aucun site trouvé en base de données.
        </div>

        <div class="site-card" *ngFor="let s of sites()">
          <div class="card-left">
            <div class="site-icon">🏢</div>
            <div class="site-info">
              <span class="site-name">{{ s.name }}</span>
              <span class="site-meta">📍 {{ s.city || 'Ville non spécifiée' }}</span>
            </div>
          </div>
          
          <div class="site-owner">
            <span class="owner-label">Client Propriétaire:</span>
            <span class="owner-value">{{ s.client_name || 'Aucun client' }}</span>
          </div>

          <div class="card-actions">
            <button class="btn-delete" (click)="deleteSite(s.id)" title="Supprimer le site">🗑️</button>
          </div>
        </div>
      </div>

      <!-- Modal Pop-up Formulaire -->
      <div class="modal-overlay" *ngIf="isModalOpen()">
        <div class="modal-card">
          <div class="modal-header">
            <h3>Créer un nouveau Site</h3>
            <button class="btn-close" (click)="closeModal()">×</button>
          </div>
          
          <form (ngSubmit)="createSite()" #siteForm="ngForm">
            <div class="form-body">
              <div class="form-group">
                <label>Nom du Site (Bâtiment) *</label>
                <input type="text" [(ngModel)]="newSite.name" name="name" required placeholder="Ex: Hôtel Atlas Agadir">
              </div>

              <div class="form-group">
                <label>Ville</label>
                <input type="text" [(ngModel)]="newSite.city" name="city" placeholder="Ex: Agadir">
              </div>

              <div class="form-group">
                <label>Client Associé *</label>
                <select class="field-select" [(ngModel)]="newSite.client_id" name="client_id" required>
                  <option value="">— Sélectionner le client —</option>
                  <option *ngFor="let c of clients()" [value]="c.id">{{ c.name }}</option>
                </select>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-secondary" (click)="closeModal()">Annuler</button>
              <button type="submit" class="btn-submit" [disabled]="!siteForm.form.valid">Enregistrer le site</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sites-container { padding: 32px; font-family: 'Inter', sans-serif; color: #f3f4f6; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; }
    .title { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; }
    .subtitle { font-size: 13px; color: #9ca3af; margin-top: 4px; }
    
    .btn-primary { background: #e63946; color: #fff; border: none; padding: 10px 18px; border-radius: 10px; font-weight: 600; cursor: pointer; }
    .btn-primary:hover { opacity: 0.9; }

    .sites-grid { display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 700px; }
    .site-card { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: #181c27; border: 1px solid #2a3045; border-radius: 14px; }
    .card-left { display: flex; align-items: center; gap: 14px; }
    .site-icon { font-size: 20px; }
    .site-name { display: block; font-size: 15px; font-weight: 600; }
    .site-meta { display: block; font-size: 12px; color: #8892a4; margin-top: 2px; }
    
    .site-owner { text-align: left; font-size: 13px; }
    .owner-label { color: #8892a4; display: block; font-size: 11px; }
    .owner-value { color: #e63946; font-weight: 600; }

    .btn-delete { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 6px 10px; cursor: pointer; }
    .btn-delete:hover { border-color: #ef4444; background: rgba(239, 68, 68, 0.2); }
    .empty-state { color: #8892a4; text-align: center; padding: 40px; }

    /* Modal Styling */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 999; }
    .modal-card { background: #1e2333; border: 1px solid #2a3045; border-radius: 16px; width: 100%; max-width: 450px; overflow: hidden; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #2a3045; }
    .btn-close { background: none; border: none; color: #8892a4; font-size: 24px; cursor: pointer; }
    .form-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; text-align: left; }
    .form-group label { font-size: 12px; color: #8892a4; }
    .form-group input, .field-select { background: #181c27; border: 1px solid #2a3045; border-radius: 8px; padding: 10px; color: #fff; font-size: 14px; outline: none; }
    .form-group input:focus, .field-select:focus { border-color: #e63946; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 20px; border-top: 1px solid #2a3045; background: #151824; }
    .btn-secondary { background: none; border: 1px solid #2a3045; color: #8892a4; padding: 8px 16px; border-radius: 8px; cursor: pointer; }
    .btn-submit { background: #e63946; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class SitesComponent implements OnInit {
  sites   = signal<Site[]>([]);
  clients = signal<Client[]>([]);
  isModalOpen = signal<boolean>(false);

  newSite = { name: '', city: '', client_id: '' };

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    // 1. GET les sites depuis SQLite
    this.http.get<{ sites: Site[] }>(`${environment.apiUrl}/admin/sites`)
      .subscribe(res => this.sites.set(res.sites || []));

    // 2. GET les clients pour le dropdown
    this.http.get<{ clients: Client[] }>(`${environment.apiUrl}/admin/clients`)
      .subscribe(res => this.clients.set(res.clients || []));
  }

  createSite(): void {
    const payload = {
      name: this.newSite.name,
      city: this.newSite.city,
      client_id: Number(this.newSite.client_id)
    };

    this.http.post(`${environment.apiUrl}/admin/sites`, payload)
      .subscribe({
        next: () => {
          this.loadData(); // Recharger le grid complet pour récupérer les jointures SQL des noms de clients
          this.closeModal();
        },
        error: (err) => console.error('Erreur création site:', err)
      });
  }

  deleteSite(id: number): void {
    if (confirm('Supprimer définitivement ce site de maintenance ?')) {
      this.http.delete(`${environment.apiUrl}/admin/sites/${id}`)
        .subscribe({
          next: () => {
            this.sites.update(current => current.filter(s => s.id !== id));
          },
          error: (err) => {
            const msg = err.error?.message || 'Impossible de supprimer ce site.';
            alert(msg);
          }
        });
    }
  }

  openModal(): void {
    this.newSite = { name: '', city: '', client_id: '' };
    this.isModalOpen.set(true);
  }

  closeModal(): void { this.isModalOpen.set(false); }
}