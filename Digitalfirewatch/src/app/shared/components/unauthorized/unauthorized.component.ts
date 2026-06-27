import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  template: `
    <div style="min-height:100vh;background:#0f1117;display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;text-align:center;padding:24px;">
      <div>
        <div style="font-size:64px;margin-bottom:16px;">🔒</div>
        <h1 style="color:#e8eaf0;font-size:28px;font-weight:700;margin-bottom:8px;">Accès refusé</h1>
        <p style="color:#8892a4;font-size:15px;margin-bottom:28px;">Vous n'avez pas les droits pour accéder à cette page.</p>
        <button
          (click)="goBack()"
          style="padding:12px 28px;background:#e63946;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;"
        >
          Retour à mon espace
        </button>
      </div>
    </div>
  `,
})
export class UnauthorizedComponent {
  constructor(private auth: AuthService, private router: Router) {}
  goBack(): void {
    if (this.auth.isLoggedIn()) this.auth.navigateToDashboard();
    else this.router.navigate(['/auth/login']);
  }
}
