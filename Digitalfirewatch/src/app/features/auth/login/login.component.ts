import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <div class="glow-bg">
        <div class="glow-circle glow-1"></div>
        <div class="glow-circle glow-2"></div>
      </div>

      <main class="login-container">
        <div class="login-card">
          
          <div class="login-header">
            <div class="logo-wrapper">
              <img src="app/assets/digital_id.png" alt="Digital ID Logo" class="company-logo" />
            </div>
            <div class="brand-meta">
              <span class="fire-icon">🔥</span>
              <span class="brand-name">DigiFireWatch</span>
            </div>
            <h1 class="login-title">Accès Sécurisé</h1>
            <p class="login-sub">Système de Supervision & Maintenance SSI</p>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="login-form" novalidate>

            <div class="field-group">
              <label class="field-label" for="username">Identifiant</label>
              <div class="field-wrap" [class.field-error]="isError('username')">
                <svg class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <input
                  id="username"
                  type="text"
                  class="field-input"
                  formControlName="username"
                  placeholder="admin / tech1"
                  autocomplete="username"
                />
              </div>
              <span class="field-err-msg" *ngIf="isError('username')">Identifiant requis</span>
            </div>

            <div class="field-group">
              <label class="field-label" for="password">Mot de passe</label>
              <div class="field-wrap" [class.field-error]="isError('password')">
                <svg class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  id="password"
                  [type]="showPwd() ? 'text' : 'password'"
                  class="field-input"
                  formControlName="password"
                  placeholder="••••••••"
                  autocomplete="current-password"
                />
                <button type="button" class="pwd-toggle" (click)="showPwd.set(!showPwd())">
                  <svg *ngIf="!showPwd()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                  <svg *ngIf="showPwd()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                </button>
              </div>
              <span class="field-err-msg" *ngIf="isError('password')">Mot de passe requis</span>
            </div>

            <div class="server-error" *ngIf="serverError()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {{ serverError() }}
            </div>

            <button type="submit" class="submit-btn" [class.loading]="loading()">
              <span *ngIf="!loading()">Se connecter</span>
              <span *ngIf="loading()" class="spinner"></span>
            </button>

          </form>

          <div class="login-footer">
            <span class="footer-note">Accès restreint. Contactez votre administrateur pour obtenir un compte.</span>
          </div>

        </div>

        <div class="login-bottom-badge">
          <span class="mono">DIGITAL ID SARL</span>
          <span class="sep">·</span>
          <span class="mono">DigiFireWatch v2</span>
        </div>
      </main>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :host {
      --bg:        #0a0b10;
      --surface:   #121420;
      --surface2:  #1a1d2f;
      --border:    #22273f;
      --accent:    #ef4444;
      --accent-h:  #dc2626;
      --text:      #f3f4f6;
      --muted:     #9ca3af;
      --dim:       #4b5563;
      display: block;
      width: 100%;
      min-height: 100%;
      overflow-x: hidden;
      background: var(--bg);
      font-family: 'Inter', sans-serif;
    }

    .page {
      display: flex;
      width: 100%;
      min-height: 100vh;
      background: var(--bg);
      align-items: center;
      justify-content: center;
      position: relative;
      overflow-x: hidden;
      margin: 0;
      padding: 24px 16px 32px;
    }

    .glow-bg { position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 0; }
    .glow-circle { position: absolute; border-radius: 50%; filter: blur(140px); opacity: 0.15; }
    .glow-1 { top: -10%; left: -10%; width: 50vw; height: 50vw; background: radial-gradient(circle, var(--accent) 0%, transparent 80%); }
    .glow-2 { bottom: -10%; right: -10%; width: 45vw; height: 45vw; background: radial-gradient(circle, #3b82f6 0%, transparent 80%); }

    .login-container { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; padding: 24px; gap: 28px; animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
    .login-card { width: 100%; max-width: 440px; background: rgba(18, 20, 32, 0.85); border: 1px solid var(--border); backdrop-filter: blur(20px); border-radius: 24px; padding: 48px 40px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05); position: relative; }

    .login-header { text-align: center; margin-bottom: 36px; }
    .logo-wrapper { margin-bottom: 16px; display: flex; justify-content: center; }
    .company-logo { height: 48px; object-fit: contain; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2)); }
    .brand-meta { display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 14px; }
    .fire-icon { font-size: 16px; }
    .brand-name { font-size: 14px; font-weight: 600; color: var(--muted); letter-spacing: 0.05em; text-transform: uppercase; }
    .login-title { font-size: 26px; font-weight: 700; color: var(--text); letter-spacing: -0.02em; }
    .login-sub { font-size: 13px; color: var(--muted); margin-top: 6px; }

    .login-form { display: flex; flex-direction: column; gap: 22px; }
    .field-group { display: flex; flex-direction: column; gap: 8px; }
    .field-label { font-size: 13px; font-weight: 500; color: var(--muted); padding-left: 2px; }

    .field-wrap { display: flex; align-items: center; background: var(--surface2); border: 1px solid var(--border); border-radius: 14px; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2); }
    .field-wrap:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15), inset 0 2px 4px rgba(0, 0, 0, 0.1); background: rgba(26, 29, 47, 0.6); }
    .field-wrap.field-error { border-color: var(--accent); }

    .field-icon { width: 18px; height: 18px; margin: 0 14px; color: var(--dim); flex-shrink: 0; transition: color 0.2s; }
    .field-wrap:focus-within .field-icon { color: var(--accent); }
    .field-input { flex: 1; background: transparent; border: none; outline: none; padding: 14px 0; font-size: 14px; color: var(--text); }
    .field-input::placeholder { color: var(--dim); }

    .pwd-toggle { background: none; border: none; cursor: pointer; padding: 0 14px; color: var(--dim); display: flex; align-items: center; transition: color 0.2s; }
    .pwd-toggle:hover { color: var(--text); }
    .pwd-toggle svg { width: 18px; height: 18px; }
    .field-err-msg { font-size: 12px; color: var(--accent); padding-left: 2px; }

    .server-error { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 12px; font-size: 13px; color: var(--accent); }
    .server-error svg { width: 16px; height: 16px; flex-shrink: 0; }

    .submit-btn { width: 100%; padding: 14px; background: var(--accent); color: #fff; border: none; border-radius: 14px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); display: flex; align-items: center; justify-content: center; min-height: 50px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25); }
    .submit-btn:hover:not(:disabled) { background: var(--accent-h); box-shadow: 0 6px 16px rgba(239, 68, 68, 0.35); }
    .submit-btn:active { transform: scale(0.98); }
    .submit-btn.loading { pointer-events: none; opacity: 0.75; }
    .spinner { width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }

    .login-footer { margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border); text-align: center; }
    .footer-note { font-size: 12px; color: var(--dim); font-style: italic; }

    .login-bottom-badge { display: flex; align-items: center; gap: 8px; font-size: 11px; color: rgba(156, 163, 175, 0.4); }
    .mono { font-family: 'JetBrains Mono', monospace; }
    .sep { color: var(--border); }

    @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class LoginComponent {
  form!: FormGroup;
  loading = signal(false);
  serverError = signal('');
  showPwd = signal(false);

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.nonNullable.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  isError(field: string): boolean {
    const c = this.form.get(field);
    return !!(c?.invalid && c?.touched);
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading.set(true);
    this.serverError.set('');

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => { this.loading.set(false); this.auth.navigateToDashboard(); },
      error: (err) => {
        this.loading.set(false);
        this.serverError.set(err.error?.message ?? 'Identifiant ou mot de passe incorrect.');
      },
    });
  }
}