// src/app/features/admin/users/users.component.ts
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
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

interface Client {
  id: number;
  company_name: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="users-page-container">
      <div class="page-header">
        <div>
          <h1 class="title">👤 User Management</h1>
          <p class="subtitle">Create, manage, modify, and revoke access for administrators, technicians, and clients</p>
        </div>
        <button routerLink="/admin/users/create" class="btn-create">
          <span class="plus-icon">＋</span> New account
        </button>
      </div>

      <div class="search-container-wrap">
        <div class="search-wrap-input">
          <span class="search-icon-lens">🔍</span>
          <input 
            type="text" 
            [value]="searchTerm()" 
            (input)="onSearchChange($event)"
            placeholder="Search by name, username, role, or company..." 
            class="search-input-field"
          />
          <button *ngIf="searchTerm()" class="btn-clear-search" (click)="clearSearch()">✕</button>
        </div>
      </div>

      <div class="users-grid">
        <div class="empty-state" *ngIf="filteredUsers().length === 0">
          No users match your search criteria.
        </div>

        <div class="user-card" *ngFor="let u of filteredUsers()">
          <div class="card-left">
            <div class="user-avatar" [class]="u.role">
              {{ u.username[0].toUpperCase() }}
            </div>
            <div class="user-info">
              <div class="user-name-row">
                <span class="user-display-name">{{ u.name || u.username }}</span>
                <span class="role-badge" [class]="u.role">{{ u.role }}</span>
              </div>
              <span class="user-meta">&#64;{{ u.username }} — {{ u.email || 'No email' }}</span>
              <span class="access-tag" *ngIf="u.ssi_access_level">SSI Level: {{ u.ssi_access_level }}</span>
              
              <div class="assigned-clients-badges" *ngIf="u.role !== 'admin' && u.client_ids.length > 0">
                <span class="assigned-title">Assigned Companies:</span>
                <div class="badges-wrap">
                  <span class="mini-client-badge" *ngFor="let clientName of getClientNames(u.client_ids)">
                    🏢 {{ clientName }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="card-actions">
            <button class="btn-edit-action" (click)="openEditModal(u)" title="Modify assignments or profile">
              ✏️
            </button>

            <button 
              *ngIf="u.id !== currentAdminId" 
              class="btn-delete" 
              (click)="deleteUser(u.id, u.username)" 
              title="Delete account">
              🗑️
            </button>
            <span *ngIf="u.id === currentAdminId" class="self-badge">Me</span>
          </div>
        </div>
      </div>

      <div class="modal-overlay-edit" *ngIf="isEditModalOpen()">
        <div class="modal-card-edit">
          <div class="modal-header-edit">
            <h3>Modify Account for &#64;{{ editingUser?.username }}</h3>
            <button class="btn-close-edit" (click)="closeEditModal()">✕</button>
          </div>
          
          <div class="form-body-edit">
            <div class="form-group-edit">
              <label>Full Name</label>
              <input type="text" [(ngModel)]="editFormFields.name" class="input-modal-edit" />
            </div>
            
            <div class="form-group-edit">
              <label>Email Address</label>
              <input type="email" [(ngModel)]="editFormFields.email" class="input-modal-edit" />
            </div>

            <div class="form-group-edit" *ngIf="editingUser?.role !== 'admin'">
              <label class="section-label-edit">Permissions / Assigned Parent Companies:</label>
              <div class="client-checkbox-list-edit" *ngIf="clients().length > 0; else noClientsData">
                <label class="checkbox-item-edit" *ngFor="let c of clients()">
                  <input 
                    type="checkbox" 
                    [checked]="isClientCheckedForEditing(c.id)" 
                    (change)="toggleClientSelectionInEdit(c.id, $event)"
                    class="checkbox-input-edit"
                  />
                  <span class="checkbox-label-text">{{ c.company_name }}</span>
                </label>
              </div>
              <ng-template #noClientsData><p class="hint-edit">No companies available.</p></ng-template>
            </div>
          </div>

          <div class="modal-footer-edit">
            <button class="btn-secondary-edit" (click)="closeEditModal()">Cancel</button>
            <button class="btn-submit-edit" (click)="updateUser()">Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .users-page-container { padding: 32px; font-family: 'Inter', sans-serif; color: #f3f4f6; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .title { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; color: #f3f4f6; }
    .subtitle { font-size: 13px; color: #9ca3af; margin-top: 4px; }
    
    .btn-create { display: flex; align-items: center; gap: 8px; padding: 10px 18px; background: #ef4444; color: #ffffff; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.25); transition: opacity 0.2s; }
    .btn-create:hover { opacity: 0.9; }

    /* 🔍 Design Barre de recherche avec Bouton Clear inline */
    .search-container-wrap { margin-bottom: 24px; max-width: 700px; }
    .search-wrap-input { display: flex; align-items: center; gap: 10px; background: #181c27; border: 1px solid #2a3045; border-radius: 12px; padding: 10px 16px; transition: border-color 0.2s; position: relative; }
    .search-wrap-input:focus-within { border-color: #ef4444; }
    .search-icon-lens { font-size: 14px; color: #8892a4; }
    .search-input-field { background: transparent; border: none; outline: none; width: 100%; color: #fff; font-size: 14px; font-family: 'Inter', sans-serif; padding-right: 24px; }
    .search-input-field::placeholder { color: #4b5563; }
    .btn-clear-search { background: transparent; border: none; color: #8892a4; font-size: 18px; cursor: pointer; position: absolute; right: 16px; top: 50%; transform: translateY(-50%); padding: 0; line-height: 1; }
    .btn-clear-search:hover { color: #fff; }

    /* Grid et Cartes */
    .users-grid { display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 700px; }
    .user-card { display: flex; align-items: flex-start; justify-content: space-between; padding: 16px 20px; background: #181c27; border: 1px solid #2a3045; border-radius: 14px; transition: border-color 0.15s; }
    .user-card:hover { border-color: #ef4444; }
    
    .card-left { display: flex; align-items: flex-start; gap: 16px; }
    .user-avatar { width: 44px; height: 44px; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; background: #4b5563; flex-shrink: 0; }
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

    .assigned-clients-badges { margin-top: 10px; padding-top: 8px; border-top: 1px dashed #2a3045; }
    .assigned-title { font-size: 11px; color: #8892a4; font-weight: 500; display: block; margin-bottom: 4px; }
    .badges-wrap { display: flex; flex-wrap: wrap; gap: 6px; }
    .mini-client-badge { font-size: 11px; font-weight: 500; background: #0f1117; color: #3b82f6; padding: 2px 8px; border-radius: 6px; border: 1px solid rgba(59, 130, 246, 0.15); }

    /* Actions buttons layout */
    .card-actions { display: flex; align-items: center; gap: 8px; }
    .btn-edit-action { background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 8px; padding: 6px 10px; cursor: pointer; font-size: 14px; transition: background 0.2s; }
    .btn-edit-action:hover { background: rgba(59, 130, 246, 0.2); border-color: #3b82f6; }
    .btn-delete { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 6px 10px; cursor: pointer; transition: background 0.2s; font-size: 14px; }
    .btn-delete:hover { background: rgba(239, 68, 68, 0.25); border-color: #ef4444; }
    
    .self-badge { font-size: 11px; font-weight: 600; color: #6b7280; background: #151824; padding: 4px 10px; border-radius: 8px; border: 1px solid #2a3045; }
    .empty-state { color: #8892a4; text-align: center; padding: 40px; font-size: 14px; }

    /* Modals Pop-up */
    .modal-overlay-edit { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 999; }
    .modal-card-edit { background: #1e2333; border: 1px solid #2a3045; border-radius: 16px; width: 100%; max-width: 460px; overflow: hidden; box-shadow: 0 12px 32px rgba(0,0,0,0.5); }
    .modal-header-edit { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #2a3045; }
    .modal-header-edit h3 { font-size: 16px; font-weight: 600; color: #fff; }
    .btn-close-edit { background: none; border: none; color: #8892a4; font-size: 24px; cursor: pointer; }
    
    .form-body-edit { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
    .form-group-edit { display: flex; flex-direction: column; gap: 6px; text-align: left; }
    .form-group-edit label { font-size: 12px; color: #8892a4; font-weight: 500; }
    .input-modal-edit { background: #181c27; border: 1px solid #2a3045; border-radius: 8px; padding: 10px 14px; color: #fff; font-size: 14px; outline: none; }
    .input-modal-edit:focus { border-color: #ef4444; }
    
    .section-label-edit { margin-top: 6px; display: block; font-weight: 600 !important; color: #e8eaf0 !important; }
    .client-checkbox-list-edit { background: #181c27; border: 1px solid #2a3045; border-radius: 8px; max-height: 160px; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
    .checkbox-item-edit { display: flex; align-items: center; gap: 10px; cursor: pointer; }
    .checkbox-input-edit { accent-color: #ef4444; width: 15px; height: 16px; }
    .checkbox-label-text { font-size: 13px; color: #e5e7eb; }

    .modal-footer-edit { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 20px; border-top: 1px solid #2a3045; background: #151824; }
    .btn-secondary-edit { background: none; border: 1px solid #2a3045; color: #8892a4; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; }
    .btn-submit-edit { background: #ef4444; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13px; }
  `]
})
export class UsersComponent implements OnInit {
  users = signal<User[]>([]);
  clients = signal<Client[]>([]);
  currentAdminId: number | null = null;

  isEditModalOpen = signal<boolean>(false);
  editingUser: User | null = null;
  editFormFields = { name: '', email: '' };
  selectedEditClientIds: number[] = [];

  searchTerm = signal<string>('');

  filteredUsers = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    if (!query) return this.users();

    return this.users().filter(u => {
      const matchName = (u.name || '').toLowerCase().includes(query);
      const matchUser = u.username.toLowerCase().includes(query);
      const matchEmail = (u.email || '').toLowerCase().includes(query);
      const matchRole = u.role.toLowerCase().includes(query);
      
      const matchClients = this.getClientNames(u.client_ids || [])
        .some(name => name.toLowerCase().includes(query));

      return matchName || matchUser || matchEmail || matchRole || matchClients;
    });
  });

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit(): void {
    this.currentAdminId = this.auth.user()?.id ?? null;
    this.loadData();
  }

  loadData(): void {
    this.http.get<{ users: User[] }>(`${environment.apiUrl}/admin/users`)
      .subscribe({
        next: (res) => this.users.set(res.users || []),
        error: (err) => console.error('Error loading users:', err)
      });

    this.http.get<{ clients: Client[] }>(`${environment.apiUrl}/admin/clients`)
      .subscribe({
        next: (res) => this.clients.set(res.clients || []),
        error: (err) => console.error('Error loading clients:', err)
      });
  }

  onSearchChange(event: Event): void {
    const inputVal = (event.target as HTMLInputElement).value;
    this.searchTerm.set(inputVal);
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  getClientNames(clientIds: number[]): string[] {
    if (!clientIds || clientIds.length === 0) return [];
    return this.clients()
      .filter(c => clientIds.includes(c.id))
      .map(c => c.company_name);
  }

  openEditModal(user: User): void {
    this.editingUser = user;
    this.editFormFields.name = user.name || '';
    this.editFormFields.email = user.email || '';
    this.selectedEditClientIds = [...(user.client_ids || [])];
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.editingUser = null;
  }

  isClientCheckedForEditing(clientId: number): boolean {
    return this.selectedEditClientIds.includes(clientId);
  }

  toggleClientSelectionInEdit(clientId: number, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    if (isChecked) {
      this.selectedEditClientIds.push(clientId);
    } else {
      this.selectedEditClientIds = this.selectedEditClientIds.filter(id => id !== clientId);
    }
  }

  updateUser(): void {
    if (!this.editingUser) return;

    const payload = {
      name: this.editFormFields.name,
      email: this.editFormFields.email,
      client_ids: this.selectedEditClientIds
    };

    this.http.put(`${environment.apiUrl}/admin/users/${this.editingUser.id}`, payload)
      .subscribe({
        next: () => {
          this.loadData();
          this.closeEditModal();
        },
        error: (err) => alert(err.error?.message || 'Error during the update process.')
      });
  }

  deleteUser(id: number, username: string): void {
    if (confirm(`Are you sure you want to permanently delete the account for @${username}?`)) {
      this.http.delete(`${environment.apiUrl}/admin/users/${id}`)
        .subscribe({
          next: () => {
            this.users.update(current => current.filter(user => user.id !== id));
          },
          error: (err) => {
            const msg = err.error?.message || 'Unable to delete this user.';
            alert(msg);
          }
        });
    }
  }
}