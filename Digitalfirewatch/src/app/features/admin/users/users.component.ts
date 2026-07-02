// src/app/features/admin/users/users.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

interface User {
  id: number;
  username: string;
  role: string;
  name: string | null;
  email: string | null;
  ssi_access_level: string | null;
  created_at: number;
  client_ids: number[];
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="users-page-container">
      <div class="page-header">
        <div>
          <h1 class="title">👤 Gestion des Utilisateurs</h1>
          <p class="subtitle">Créez, gérez et révoquez les accès des administrateurs, techniciens et clients</p>
        </div>
        <button routerLink="/admin/users/create" class="btn-create">
          <span class="plus-icon">＋</span> Nouveau compte
        </button>
      </div>

      <div class="users-grid">
        <div class="empty-state" *ngIf="users().length === 0">
          Aucun utilisateur trouvé en base de données.
        </div>

        <div class="user-card" *ngFor="let u of users()">
          <div class="card-left">
            <div class="user-avatar" [class]="u.role">
              {{ u.username[0].toUpperCase() }}
            </div>
            <div class="user-info">
              <div class="user-name-row">
                <span class="user-display-name">{{ u.name || u.username }}</span>
                <span class="role-badge" [class]="u.role">{{ u.role }}</span>
              </div>
              <span class="user-meta">&#64;{{ u.username }} — {{ u.email || 'Pas d\\'email' }}</span>
              <span class="access-tag" *ngIf="u.ssi_access_level">SSI Niv: {{ u.ssi_access_level }}</span>
            </div>
          </div>

          <div class="card-actions">
            <button 
              *ngIf="u.id !== currentAdminId" 
              class="btn-delete" 
              (click)="deleteUser(u.id, u.username)" 
              title="Supprimer le compte">
              🗑️
            </button>
            <span *ngIf="u.id === currentAdminId" class="self-badge">Moi</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .users-page-container { padding: 32px; font-family: 'Inter', sans-serif; color: #f3f4f6; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; }
    .title { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; color: #f3f4f6; }
    .subtitle { font-size: 13px; color: #9ca3af; margin-top: 4px; }
    
    .btn-create { display: flex; align-items: center; gap: 8px; padding: 10px 18px; background: #ef4444; color: #ffffff; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.25); transition: opacity 0.2s; }
    .btn-create:hover { opacity: 0.9; }

    /* Grid et Cartes */
    .users-grid { display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 700px; }
    .user-card { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: #181c27; border: 1px solid #2a3045; border-radius: 14px; transition: border-color 0.15s; }
    .user-card:hover { border-color: #ef4444; }
    
    .card-left { display: flex; align-items: center; gap: 16px; }
    
    .user-avatar { width: 44px; height: 44px; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; background: #4b5563; }
    .user-avatar.admin { background: #ef4444; }
    .user-avatar.technician { background: #3b82f6; }
    .user-avatar.client { background: #10b981; }

    .user-info { text-align: left; }
    .user-name-row { display: flex; align-items: center; gap: 8px; }
    .user-display-name { font-size: 15px; font-weight: 600; color: #f3f4f6; }
    
    .role-badge { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 6px; text-transform: uppercase; }
    .role-badge.admin { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
    .role-badge.technician { background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.2); }
    .role-badge.client { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }

    .user-meta { display: block; font-size: 12px; color: #8892a4; margin-top: 4px; }
    .access-tag { display: inline-block; font-size: 11px; color: #f59e0b; background: rgba(245, 158, 11, 0.1); padding: 1px 5px; border-radius: 4px; margin-top: 4px; font-weight: 500; }

    /* Actions */
    .card-actions { display: flex; align-items: center; gap: 12px; }
    .btn-delete { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 6px 10px; cursor: pointer; transition: background 0.2s; font-size: 14px; }
    .btn-delete:hover { background: rgba(239, 68, 68, 0.25); border-color: #ef4444; }
    
    .self-badge { font-size: 11px; font-weight: 600; color: #6b7280; background: #151824; padding: 4px 10px; border-radius: 8px; border: 1px solid #2a3045; }
    .empty-state { color: #8892a4; text-align: center; padding: 40px; }
  `]
})
export class UsersComponent implements OnInit {
  users = signal<User[]>([]);
  currentAdminId: number | null = null;

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit(): void {
    // Récupérer l'ID de l'admin actuellement connecté pour bloquer sa propre suppression
    this.currentAdminId = this.auth.user()?.id ?? null;
    this.loadUsers();
  }

  // GET dynamique depuis la base de données SQLite
  loadUsers(): void {
    this.http.get<{ users: User[] }>(`${environment.apiUrl}/admin/users`)
      .subscribe({
        next: (res) => this.users.set(res.users || []),
        error: (err) => console.error('Erreur chargement utilisateurs:', err)
      });
  }

  // DELETE avec gestion réactive synchrone (Signal Update)
  deleteUser(id: number, username: string): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement le compte de @${username} ?`)) {
      this.http.delete(`${environment.apiUrl}/admin/users/${id}`)
        .subscribe({
          next: () => {
            // Success 200 OK — Filtrage du signal à la volée
            this.users.update(current => current.filter(user => user.id !== id));
            console.log(`[CRUD] Compte utilisateur ${id} révoqué.`);
          },
          error: (err) => {
            console.error('Erreur suppression utilisateur:', err);
            const msg = err.error?.message || 'Impossible de supprimer cet utilisateur.';
            alert(msg);
          }
        });
    }
  }
}