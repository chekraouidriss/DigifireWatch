// src/app/features/admin/admin-layout.component.ts
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="layout">
      <aside class="sidebar" [class.collapsed]="collapsed()">
        <div class="sidebar-top">
          <div class="brand">
            <span class="brand-icon">🔥</span>
            <span class="brand-name" *ngIf="!collapsed()">DigiFireWatch</span>
          </div>
          <button class="collapse-btn" (click)="collapsed.set(!collapsed())" title="Réduire">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="role-badge" *ngIf="!collapsed()">
          <span class="role-dot"></span>
          <span>Administrateur</span>
        </div>

        <nav class="nav">
          <a class="nav-item" routerLink="/admin/dashboard" routerLinkActive="active" title="Tableau de bord">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            <span *ngIf="!collapsed()">Tableau de bord</span>
          </a>
          <a class="nav-item" routerLink="/admin/gateways" routerLinkActive="active" title="Gateways TRB">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1"/></svg>
            <span *ngIf="!collapsed()">Gateways TRB</span>
          </a>
          <a class="nav-item" routerLink="/admin/clients" routerLinkActive="active" title="Entreprises (Maison Mère)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span *ngIf="!collapsed()">Entreprises & ECS</span>
          </a>
          <a class="nav-item" routerLink="/admin/events" routerLinkActive="active" title="Événements">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            <span *ngIf="!collapsed()">Journal Unifié</span>
          </a>
          <a class="nav-item" routerLink="/admin/users" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: false }" title="Utilisateurs">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span *ngIf="!collapsed()">Utilisateurs</span>
          </a>
        </nav>

        <div class="sidebar-bottom">
          <div class="user-chip" *ngIf="!collapsed()">
            <div class="user-avatar">{{ initials() }}</div>
            <div class="user-info">
              <span class="user-name">{{ auth.user()?.name || auth.user()?.username }}</span>
              <span class="user-role">Admin</span>
            </div>
          </div>
          <button class="logout-btn" (click)="logout()" title="Se déconnecter">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span *ngIf="!collapsed()">Déconnexion</span>
          </button>
        </div>
      </aside>

      <div class="main">
        <header class="topbar">
          <div class="topbar-left">
            <h2 class="page-title">{{ pageTitle() }}</h2>
          </div>
          <div class="topbar-right">
            <div class="status-pill online">
              <span class="dot"></span>
              Système opérationnel
            </div>
          </div>
        </header>
        <div class="content">
          <router-outlet />
        </div>
      </div>
    </div>
  `,
  styles: [`
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :host {
      --bg: #0f1117; --surface: #181c27; --surface2: #1e2333; --border: #2a3045;
      --accent: #e63946; --text: #e8eaf0; --muted: #8892a4; --dim: #5a6378; --green: #2a9d8f;
      --sidebar-w: 240px; --sidebar-collapsed: 64px;
      display: block; font-family: 'Inter', sans-serif;
    }
    .layout { display: flex; min-height: 100vh; background: var(--bg); }
    .sidebar { width: var(--sidebar-w); flex-shrink: 0; background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; transition: width .25s ease; overflow: hidden; }
    .sidebar.collapsed { width: var(--sidebar-collapsed); }
    .sidebar-top { display: flex; align-items: center; justify-content: space-between; padding: 20px 16px; border-bottom: 1px solid var(--border); gap: 8px; }
    .brand { display: flex; align-items: center; gap: 10px; overflow: hidden; }
    .brand-icon { font-size: 22px; flex-shrink: 0; }
    .brand-name { font-size: 15px; font-weight: 700; color: var(--text); white-space: nowrap; }
    .collapse-btn { background: none; border: none; cursor: pointer; color: var(--dim); padding: 4px; border-radius: 6px; }
    .collapse-btn:hover { color: var(--muted); background: var(--surface2); }
    .collapse-btn svg { width: 18px; height: 18px; }
    .role-badge { display: flex; align-items: center; gap: 8px; padding: 10px 16px; font-size: 11px; color: var(--accent); font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: .08em; }
    .role-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); }
    .nav { flex: 1; padding: 8px; display: flex; flex-direction: column; gap: 2px; }
    .nav-item { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 8px; color: var(--muted); text-decoration: none; font-size: 14px; font-weight: 500; transition: all .15s; }
    .nav-item svg { width: 20px; height: 20px; flex-shrink: 0; }
    .nav-item:hover { background: var(--surface2); color: var(--text); }
    .nav-item.active { background: rgba(230,57,70,.1); color: var(--accent); }
    .sidebar-bottom { padding: 12px 8px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 6px; }
    .user-chip { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; }
    .user-avatar { width: 32px; height: 32px; border-radius: 8px; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; }
    .user-info { display: flex; flex-direction: column; overflow: hidden; }
    .user-name { font-size: 13px; font-weight: 600; color: var(--text); white-space: nowrap; text-overflow: ellipsis; }
    .user-role { font-size: 11px; color: var(--dim); }
    .logout-btn { display: flex; align-items: center; gap: 10px; padding: 10px; background: none; border: none; cursor: pointer; color: var(--dim); font-size: 14px; font-weight: 500; width: 100%; border-radius: 8px; }
    .logout-btn:hover { background: rgba(230,57,70,.08); color: var(--accent); }
    .logout-btn svg { width: 18px; height: 18px; }
    .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .topbar { display: flex; align-items: center; justify-content: space-between; padding: 0 28px; height: 60px; background: var(--surface); border-bottom: 1px solid var(--border); }
    .page-title { font-size: 16px; font-weight: 600; color: var(--text); }
    .status-pill { display: flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
    .status-pill.online { background: rgba(42,157,143,.1); color: var(--green); border: 1px solid rgba(42,157,143,.3); }
    .status-pill .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    .content { flex: 1; overflow-y: auto; padding: 28px; }
  `],
})
export class AdminLayoutComponent {
  collapsed = signal(false);
  constructor(public auth: AuthService, private router: Router) {}
  initials(): string {
    const u = this.auth.user();
    return (u?.name || u?.username || 'A').slice(0, 2).toUpperCase();
  }
  pageTitle(): string {
    const url = this.router.url;
    if (url.includes('/admin/users/create')) return 'Créer un compte';
    const map: Record<string, string> = {
      '/admin/dashboard': 'Tableau de bord',
      '/admin/gateways':  'Gateways TRB',
      '/admin/clients':   'Entreprises & Centrales ECS',
      '/admin/events':    'Journal des Télémétries Unifiées',
      '/admin/users':     'Comptes Utilisateurs',
    };
    return Object.entries(map).find(([k]) => url.startsWith(k))?.[1] ?? 'DigiFireWatch';
  }
  logout(): void { this.auth.logout(); }
}