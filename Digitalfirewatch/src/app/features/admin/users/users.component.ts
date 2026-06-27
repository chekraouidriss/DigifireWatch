// src/app/features/admin/users/users.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="users-container">
      <div class="avatar-icon">👤</div>
      <h2 class="title">Gestion des utilisateurs</h2>
      <p class="subtitle">
        Créez et gérez les comptes Admin, Technicien et Client.<br>
        <span class="api-tag">API :</span> GET/POST /api/admin/users
      </p>
      
      <div class="action-row">
        <button routerLink="/admin/users/create" class="btn-create">
          <span class="plus-icon">＋</span> Nouveau compte
        </button>
      </div>
    </div>
  `,
  styles: [`
    .users-container {
      padding: 60px 40px;
      text-align: center;
      font-family: 'Inter', sans-serif;
      color: #9ca3af;
      max-width: 600px;
      margin: 0 auto;
    }

    .avatar-icon {
      font-size: 56px;
      margin-bottom: 20px;
      filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
    }

    .title {
      color: #f3f4f6;
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 12px;
      letter-spacing: -0.02em;
    }

    .subtitle {
      font-size: 14px;
      line-height: 1.6;
      color: #9ca3af;
      margin-bottom: 32px;
    }

    .api-tag {
      color: #ef4444;
      font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
    }

    .action-row {
      display: flex;
      justify-content: center;
    }

    .btn-create {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background: #ef4444;
      color: #ffffff;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(239, 68, 68, 0.25);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .btn-create:hover {
      background: #dc2626;
      box-shadow: 0 6px 20px rgba(239, 68, 68, 0.35);
      transform: translateY(-1px);
    }

    .btn-create:active {
      transform: translateY(0);
    }

    .plus-icon {
      font-size: 16px;
      font-weight: 700;
    }
  `]
})
export class UsersComponent {}