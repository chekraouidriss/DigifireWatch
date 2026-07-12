// src/app/features/technician/technician-layout.component.ts
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-technician-layout',
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
          <button class="collapse-btn" (click)="collapsed.set(!collapsed())" [title]="collapsed() ? 'Expand menu' : 'Collapse menu'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="role-badge" *ngIf="!collapsed()">
          <span class="role-dot"></span>
          <span>Technician</span>
        </div>

        <nav class="nav">
          <a class="nav-item" routerLink="/technician/dashboard" routerLinkActive="active" title="Assigned Panels">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            <span *ngIf="!collapsed()">Assigned Panels</span>
          </a>
          <a class="nav-item" routerLink="/technician/interventions" routerLinkActive="active" title="Interventions">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span *ngIf="!collapsed()">Interventions</span>
          </a>
        </nav>

        <div class="sidebar-bottom">
          <button class="logout-btn" (click)="auth.logout()" title="Sign Out">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span *ngIf="!collapsed()">Sign Out</span>
          </button>
        </div>
      </aside>

      <div class="main">
        <header class="topbar">
          <span class="topbar-title">Technician Space</span>
          <span class="user-name">{{ auth.user()?.name || auth.user()?.username }}</span>
        </header>
        <div class="content"><router-outlet /></div>
      </div>
    </div>
  `,
  styles: [`
    :host { 
      --bg:#0f1117; --surface:#181c27; --surface2:#1e2333; --border:#2a3045; --accent:#457b9d; --text:#e8eaf0; --muted:#8892a4; --dim:#5a6378; 
      --sidebar-w: 220px; --sidebar-collapsed: 64px;
      display:block; font-family:'Inter',sans-serif; 
    }
    .layout { display:flex; min-height:100vh; background:var(--bg); }
    
    /* ⚡ REFACTORED SIDEBAR CLASSES SUPPORTING SMOOTH COLLAPSE TRANSITION */
    .sidebar { width:var(--sidebar-w); background:var(--surface); border-right:1px solid var(--border); display:flex; flex-direction:column; flex-shrink:0; transition: width .25s ease; overflow: hidden; }
    .sidebar.collapsed { width: var(--sidebar-collapsed); }
    
    .sidebar-top { display: flex; align-items: center; justify-content: space-between; padding: 20px 16px; border-bottom: 1px solid var(--border); gap: 8px; }
    .brand { display: flex; align-items: center; gap: 10px; overflow: hidden; flex: 1; }
    .brand-icon { font-size: 22px; flex-shrink: 0; }
    .brand-name { font-size: 14px; font-weight:700; color:var(--text); white-space: nowrap; }
    
    .collapse-btn { background: none; border: none; cursor: pointer; color: var(--dim); padding: 4px; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
    .collapse-btn:hover { color: var(--muted); background: var(--surface2); }
    .collapse-btn svg { width: 18px; height: 18px; }

    .role-badge { display: flex; align-items: center; gap: 8px; padding:10px 16px; font-size:11px; color:var(--accent); font-family: 'JetBrains Mono', monospace; font-weight:600; text-transform: uppercase; letter-spacing: .08em; }
    .role-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); }
    
    .nav { flex:1; padding:8px; display:flex; flex-direction:column; gap:2px; }
    .nav-item { display:flex; align-items:center; gap:12px; padding:10px; border-radius:8px; color:var(--muted); text-decoration:none; font-size:14px; font-weight: 500; transition: all .15s; }
    .nav-item svg { width:18px; height:18px; flex-shrink:0; }
    .nav-item:hover { background:var(--surface2); color:var(--text); }
    .nav-item.active { background:rgba(69,123,157,.12); color:var(--accent); }
    
    .sidebar-bottom { padding:12px 8px; border-top:1px solid var(--border); }
    .logout-btn { display:flex; align-items:center; gap:12px; padding:9px 10px; border-radius:8px; background:none; border:none; cursor:pointer; color:var(--dim); font-size:14px; font-weight: 500; width:100%; transition: all .15s; }
    .logout-btn:hover { background:rgba(230,57,70,.08); color:#e63946; }
    .logout-btn svg { width:16px; height:16px; flex-shrink: 0; }
    
    .main { flex:1; display:flex; flex-direction:column; }
    .topbar { display:flex; align-items:center; justify-content:space-between; padding:0 24px; height:56px; background:var(--surface); border-bottom:1px solid var(--border); }
    .topbar-title { font-size:15px; font-weight:600; color:var(--text); }
    .user-name { font-size:13px; color:var(--muted); }
    .content { flex:1; padding:24px; overflow-y:auto; }
  `]
})
export class TechnicianLayoutComponent {
  // ⚡ COMPONENT SIGNAL INJECTED
  collapsed = signal(false);

  constructor(public auth: AuthService) {}
}