// src/app/features/admin/clients/clients.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';

interface Client {
  id: number;
  name: string;
  city: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: number;
}

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="clients-container">
      <div class="page-header">
        <div>
          <h1 class="title">👥 Gestion des Clients (Sociétés)</h1>
          <p class="subtitle">Entités juridiques et comptes de maintenance supervisés</p>
        </div>
        <button class="btn-primary" (click)="openModal()">＋ Ajouter une société</button>
      </div>

      <div class="clients-grid">
        <div class="empty-state" *ngIf="clients().length === 0">
          Aucun client trouvé en base de données.
        </div>

        <div class="client-card" *ngFor="let c of clients()">
          <div class="card-left">
            <div class="client-avatar">{{ c.name[0].toUpperCase() }}</div>
            <div class="client-info">
              <span class="client-name">{{ c.name }}</span>
              <span class="client-city">📍 {{ c.city || 'Ville non spécifiée' }}</span>
            </div>
          </div>
          
          <div class="client-contact" *ngIf="c.contact_name">
            <span class="contact-label">Contact:</span>
            <span class="contact-value">{{ c.contact_name }}</span>
          </div>

          <div class="card-actions">
            <span class="status-badge">ACTIF</span>
            <button class="btn-delete" (click)="deleteClient(c.id)" title="Supprimer la société">
              🗑️
            </button>
          </div>
        </div>
      </div>

      <div class="modal-overlay" *ngIf="isModalOpen()">
        <div class="modal-card">
          <div class="modal-header">
            <h3>Créer une nouvelle entité Client</h3>
            <button class="btn-close" (click)="closeModal()">×</button>
          </div>
          
          <form (ngSubmit)="createClient()" #clientForm="ngForm">
            <div class="form-body">
              <div class="form-group">
                <label>Nom de la société *</label>
                <input type="text" [(ngModel)]="newClient.name" name="name" required placeholder="Ex: Youness Safety">
              </div>

              <div class="form-group">
                <label>Ville</label>
                <input type="text" [(ngModel)]="newClient.city" name="city" placeholder="Ex: Agadir">
              </div>

              <div class="form-group">
                <label>Nom du responsable</label>
                <input type="text" [(ngModel)]="newClient.contact_name" name="contact_name" placeholder="Ex: Youness Tazi">
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-secondary" (click)="closeModal()">Annuler</button>
              <button type="submit" class="btn-submit" [disabled]="!clientForm.form.valid">Enregistrer la société</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .clients-container { padding: 32px; font-family: 'Inter', sans-serif; color: #f3f4f6; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; }
    .title { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; }
    .subtitle { font-size: 13px; color: #9ca3af; margin-top: 4px; }
    
    .btn-primary { background: #e63946; color: #fff; border: none; padding: 10px 18px; border-radius: 10px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
    .btn-primary:hover { opacity: 0.9; }

    /* Grid et Cartes */
    .clients-grid { display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 650px; }
    .client-card { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: #181c27; border: 1px solid #2a3045; border-radius: 14px; transition: border-color 0.15s; }
    .client-card:hover { border-color: #3b82f6; }
    .card-left { display: flex; align-items: center; gap: 14px; }
    .client-avatar { width: 40px; height: 40px; border-radius: 50%; background: #e63946; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; }
    .client-name { display: block; font-size: 15px; font-weight: 600; }
    .client-city { display: block; font-size: 12px; color: #8892a4; margin-top: 2px; }
    
    .client-contact { text-align: left; font-size: 13px; }
    .contact-label { color: #8892a4; display: block; font-size: 11px; }
    .contact-value { color: #e8eaf0; font-weight: 500; }

    /* Actions & Badges */
    .card-actions { display: flex; align-items: center; gap: 12px; }
    .status-badge { font-size: 10px; font-weight: 700; color: #2a9d8f; background: rgba(42,157,143,.1); padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(42,157,143,.2); }
    
    .btn-delete { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 6px 10px; cursor: pointer; transition: background 0.2s; font-size: 14px; }
    .btn-delete:hover { background: rgba(239, 68, 68, 0.25); border-color: #ef4444; }

    .empty-state { color: #8892a4; text-align: center; padding: 40px; }

    /* Modal Pop-up */
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 999; }
    .modal-card { background: #1e2333; border: 1px solid #2a3045; border-radius: 16px; width: 100%; max-width: 450px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #2a3045; }
    .modal-header h3 { font-size: 16px; font-weight: 600; }
    .btn-close { background: none; border: none; color: #8892a4; font-size: 24px; cursor: pointer; }
    
    .form-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; text-align: left; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 12px; color: #8892a4; font-weight: 500; }
    .form-group input { background: #181c27; border: 1px solid #2a3045; border-radius: 8px; padding: 10px; color: #fff; font-size: 14px; }
    .form-group input:focus { border-color: #e63946; outline: none; }

    .modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 20px; border-top: 1px solid #2a3045; background: #151824; }
    .btn-secondary { background: none; border: 1px solid #2a3045; color: #8892a4; padding: 8px 16px; border-radius: 8px; cursor: pointer; }
    .btn-submit { background: #e63946; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class ClientsComponent implements OnInit {
  clients = signal<Client[]>([]);
  isModalOpen = signal<boolean>(false);

  newClient = { name: '', city: '', contact_name: '' };

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadClients();
  }

  loadClients(): void {
    this.http.get<{ clients: Client[] }>(`${environment.apiUrl}/admin/clients`)
      .subscribe({
        next: (res) => this.clients.set(res.clients || []),
        error: (err) => console.error('Erreur chargement clients:', err)
      });
  }

  createClient(): void {
    this.http.post<{ client: Client }>(`${environment.apiUrl}/admin/clients`, this.newClient)
      .subscribe({
        next: (res) => {
          if (res.client) {
            this.clients.update(current => [...current, res.client]);
            this.closeModal();
          }
        },
        error: (err) => console.error('Erreur création client:', err)
      });
  }
  // 🗑️ DELETE Dynamique avec confirmation de sécurité
 deleteClient(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer définitivement cette société de la base de données ?')) {
      this.http.delete(`${environment.apiUrl}/admin/clients/${id}`)
        .subscribe({
          next: () => {
            // Success 200 OK
            this.clients.update(current => current.filter(client => client.id !== id));
            console.log(`[CRUD] Client ${id} supprimé.`);
          },
          error: (err) => {
            console.error('Erreur suppression:', err);
            const errorMsg = err.error?.message || 'Une erreur est survenue lors de la suppression.';
            alert(errorMsg);
          }
        });
    }
  }

  openModal(): void {
    this.newClient = { name: '', city: '', contact_name: '' };
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }
}