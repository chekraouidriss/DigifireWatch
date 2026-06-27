// src/app/features/client/client-layout.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div style="display:flex;min-height:100vh;background:#0f1117;font-family:Inter,sans-serif;">
      <aside style="width:200px;background:#181c27;border-right:1px solid #2a3045;display:flex;flex-direction:column;flex-shrink:0;">
        <div style="display:flex;align-items:center;gap:10px;padding:20px 16px;border-bottom:1px solid #2a3045;">
          <span style="font-size:20px;">🔥</span>
          <span style="font-weight:700;color:#e8eaf0;font-size:15px;">DigiFireWatch</span>
        </div>
        <div style="padding:10px 16px;font-size:12px;color:#7b68ee;font-weight:600;">👤 Espace Client</div>
        <nav style="flex:1;padding:8px;display:flex;flex-direction:column;gap:2px;">
          <a routerLink="/client/dashboard" routerLinkActive="active" style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:8px;color:#8892a4;text-decoration:none;font-size:14px;">🏠 Tableau de bord</a>
          <a routerLink="/client/alerts" routerLinkActive="active" style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:8px;color:#8892a4;text-decoration:none;font-size:14px;">🚨 Alertes</a>
        </nav>
        <div style="padding:12px 8px;border-top:1px solid #2a3045;">
          <button (click)="auth.logout()" style="display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:8px;background:none;border:none;cursor:pointer;color:#5a6378;font-size:13px;width:100%;">⏻ Déconnexion</button>
        </div>
      </aside>
      <div style="flex:1;display:flex;flex-direction:column;">
        <header style="display:flex;align-items:center;justify-content:space-between;padding:0 24px;height:56px;background:#181c27;border-bottom:1px solid #2a3045;">
          <span style="font-size:15px;font-weight:600;color:#e8eaf0;">Mon espace</span>
          <span style="font-size:13px;color:#8892a4;">{{ auth.user()?.name || auth.user()?.username }}</span>
        </header>
        <div style="flex:1;padding:24px;overflow-y:auto;"><router-outlet /></div>
      </div>
    </div>
  `,
})
export class ClientLayoutComponent { constructor(public auth: AuthService) {} }
