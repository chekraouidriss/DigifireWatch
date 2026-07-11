// src/app/features/admin/users/create/create-user.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { UserService, CreateUserPayload } from '../../../../core/services/user.service';
import { environment } from '../../../../../environments/environment';

interface Client { id: number; company_name: string; }

@Component({
  selector: 'app-create-user',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="page">
      <div class="glow-bg">
        <div class="glow-circle glow-1"></div>
      </div>

      <nav class="breadcrumb">
        <a routerLink="/admin/users" class="bc-link">Users</a>
        <span class="bc-sep">›</span>
        <span class="bc-current">New Account</span>
      </nav>

      <div class="card">
        <div class="card-header">
          <div class="eyebrow">Administration</div>
          <h1 class="title">Create a User Account</h1>
          <p class="subtitle">
            This form is restricted to administrators. The created account will be immediately operational on the DigiFireWatch platform.
          </p>
        </div>

        <div class="banner success" *ngIf="successMsg()" role="status">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          {{ successMsg() }}
        </div>

        <div class="banner error" *ngIf="serverError()" role="alert">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {{ serverError() }}
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form" novalidate>
          
          <div class="row-2">
            <div class="field-group">
              <label class="field-label" for="name">Full Name</label>
              <div class="field-wrap" [class.field-error]="isErr('name')">
                <input id="name" type="text" class="field-input" formControlName="name" placeholder="Yassin Alami" />
              </div>
              <span class="field-err" *ngIf="isErr('name')">Full name is required</span>
            </div>
            
            <div class="field-group">
              <label class="field-label" for="username">Login Username</label>
              <div class="field-wrap" [class.field-error]="isErr('username')">
                <input id="username" type="text" class="field-input" formControlName="username" placeholder="yassin.alami" autocomplete="off" />
              </div>
              <span class="field-err" *ngIf="isErr('username')">Username is required</span>
            </div>
          </div>

          <div class="field-group">
            <label class="field-label" for="email">
              Email Address <span class="optional">(optional)</span>
            </label>
            <div class="field-wrap">
              <input id="email" type="email" class="field-input" formControlName="email" placeholder="yassin@example.com" />
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">Access Role</label>
            <div class="role-grid">
              <button type="button" class="role-card"
                      *ngFor="let r of roles"
                      [class.active]="form.get('role')?.value === r.value"
                      (click)="setRole(r.value)">
                <span class="role-icon">{{ r.icon }}</span>
                <span class="role-name">{{ r.label }}</span>
                <span class="role-desc">{{ r.desc }}</span>
              </button>
            </div>
          </div>

          <div class="field-group" *ngIf="form.get('role')?.value === 'technician'">
            <label class="field-label" for="ssi_level">
              SSI Access Level <span class="optional">(NF S 61-931)</span>
            </label>
            <div class="field-wrap">
              <select id="ssi_level" class="field-select" formControlName="ssi_access_level">
                <option value="">— Select access level —</option>
                <option value="I">Level I — Operator</option>
                <option value="II">Level II — Routine Maintenance</option>
                <option value="III">Level III — Specialized Maintenance</option>
                <option value="IV">Level IV — Manufacturer / Installer</option>
              </select>
            </div>
          </div>

          <div class="field-group" *ngIf="form.get('role')?.value && form.get('role')?.value !== 'admin'">
            <label class="field-label">
              Assigned Clients <span class="optional">(optional)</span>
            </label>
            <div class="client-list" *ngIf="clients().length > 0; else noClients">
              <label class="client-item" *ngFor="let c of clients()">
                <input type="checkbox" class="client-checkbox" [value]="c.id" (change)="onClientToggle(c.id, $event)" />
                <span class="client-name">{{ c.company_name }}</span>
              </label>
            </div>
            <ng-template #noClients>
              <p class="hint">No clients available in the database.</p>
            </ng-template>
          </div>

          <div class="row-2">
            <div class="field-group">
              <label class="field-label" for="password">Password</label>
              <div class="field-wrap" [class.field-error]="isErr('password')">
                <input id="password" [type]="showPwd() ? 'text' : 'password'" class="field-input" formControlName="password" placeholder="Min. 8 characters" autocomplete="new-password" />
                <button type="button" class="pwd-toggle" (click)="showPwd.set(!showPwd())">
                  {{ showPwd() ? '🙈' : '👁️' }}
                </button>
              </div>
              <span class="field-err" *ngIf="isErr('password')">
                {{ form.get('password')?.errors?.['minlength'] ? 'Minimum 8 characters required' : 'Password is required' }}
              </span>
            </div>
            
            <div class="field-group">
              <label class="field-label" for="confirm">Confirm Password</label>
              <div class="field-wrap" [class.field-error]="isErr('confirm')">
                <input id="confirm" type="password" class="field-input" formControlName="confirm" placeholder="••••••••" autocomplete="new-password" />
              </div>
              <span class="field-err" *ngIf="isErr('confirm')">
                {{ form.errors?.['mismatch'] ? 'Passwords do not match' : 'Confirmation is required' }}
              </span>
            </div>
          </div>

          <div class="form-actions">
            <a routerLink="/admin/users" class="btn-ghost">Cancel</a>
            <button type="submit" class="btn-primary" [class.is-loading]="loading()" [disabled]="loading()">
              <span *ngIf="!loading()">Create Account</span>
              <span *ngIf="loading()" class="spinner"></span>
            </button>
          </div>

        </form>
      </div>
    </div>
  `,
  styles: [`
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
      --green:     #10b981;
      display: block;
      font-family: 'Inter', sans-serif;
      width: 100%;
    }
    .page { display: flex; flex-direction: column; gap: 24px; max-width: 780px; margin: 0 auto; padding: 16px; position: relative; }
    .glow-bg { position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 0; }
    .glow-circle { position: absolute; border-radius: 50%; filter: blur(120px); opacity: 0.08; }
    .glow-1 { top: -10%; right: -10%; width: 30vw; height: 30vw; background: radial-gradient(circle, var(--accent) 0%, transparent 80%); }
    .breadcrumb { display: flex; align-items: center; gap: 8px; font-size: 13px; z-index: 1; }
    .bc-link { var(--muted); text-decoration: none; transition: color .15s; }
    .bc-link:hover { color: var(--text); }
    .bc-sep { color: var(--dim); }
    .bc-current { color: var(--text); font-weight: 500; }
    .card { background: rgba(18, 20, 32, 0.65); border: 1px solid var(--border); backdrop-filter: blur(20px); border-radius: 20px; padding: 40px; box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2); z-index: 1; }
    .card-header { margin-bottom: 28px; }
    .eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--accent); text-transform: uppercase; letter-spacing: .12em; margin-bottom: 6px; }
    .title { font-size: 24px; font-weight: 700; color: var(--text); letter-spacing: -.02em; }
    .subtitle { font-size: 13px; color: var(--muted); margin-top: 6px; line-height: 1.5; }
    .banner { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 12px; font-size: 13px; margin-bottom: 24px; }
    .banner svg { width: 16px; height: 16px; flex-shrink: 0; }
    .banner.success { color: var(--green); background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); }
    .banner.error { color: var(--accent); background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); }
    .form { display: flex; flex-direction: column; gap: 24px; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    @media (max-width: 600px) { .row-2 { grid-template-columns: 1fr; gap: 24px; } }
    .field-group { display: flex; flex-direction: column; gap: 8px; }
    .field-label { font-size: 13px; font-weight: 500; color: var(--muted); padding-left: 2px; }
    .optional { font-size: 11px; color: var(--dim); font-weight: 400; }
    .field-wrap { display: flex; align-items: center; background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
    .field-wrap:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12); }
    .field-wrap.field-error { border-color: var(--accent); }
    .field-input, .field-select { width: 100%; padding: 12px 16px; background: transparent; border: none; outline: none; color: var(--text); font-size: 14px; font-family: 'Inter', sans-serif; }
    .field-input::placeholder { color: var(--dim); }
    .field-select { cursor: pointer; color: var(--text); }
    .field-select option { background: var(--surface2); color: var(--text); }
    .pwd-toggle { background: none; border: none; cursor: pointer; padding: 0 16px; color: var(--dim); }
    .pwd-toggle:hover { color: var(--text); }
    .field-err { font-size: 11.5px; color: var(--accent); padding-left: 2px; margin-top: 2px; }
    .role-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    @media (max-width: 480px) { .role-grid { grid-template-columns: 1fr; } }
    .role-card { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px 12px; background: var(--surface2); border: 1px solid var(--border); border-radius: 14px; cursor: pointer; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); text-align: center; color: var(--text); }
    .role-card:hover { border-color: var(--muted); transform: translateY(-1px); }
    .role-card.active { border-color: var(--accent); background: rgba(239, 68, 68, 0.08); box-shadow: 0 0 0 1px var(--accent); }
    .role-icon { font-size: 22px; }
    .role-name { font-size: 13px; font-weight: 600; color: var(--text); }
    .role-desc { font-size: 11px; color: var(--muted); line-height: 1.2; }
    .client-list { display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto; padding-right: 4px; }
    .client-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; cursor: pointer; transition: border-color .15s; }
    .client-item:hover { border-color: var(--muted); }
    .client-checkbox { accent-color: var(--accent); width: 16px; height: 16px; cursor: pointer; }
    .client-name { font-size: 14px; color: var(--text); font-weight: 500; }
    .hint { font-size: 12px; color: var(--dim); font-style: italic; }
    .form-actions { display: flex; justify-content: flex-end; align-items: center; gap: 16px; padding-top: 16px; border-top: 1px solid var(--border); margin-top: 8px; }
    .btn-primary { padding: 12px 28px; background: var(--accent); color: #fff; border: none; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; min-width: 160px; min-height: 46px; transition: all 0.2s; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2); }
    .btn-primary:hover:not(:disabled) { background: var(--accent-h); box-shadow: 0 6px 16px rgba(239, 68, 68, 0.3); }
    .btn-primary:disabled { opacity: .5; cursor: not-allowed; box-shadow: none; }
    .btn-ghost { padding: 12px 24px; background: transparent; color: var(--muted); border: 1px solid var(--border); border-radius: 12px; font-size: 14px; font-weight: 500; text-decoration: none; display: flex; align-items: center; transition: all .15s; cursor: pointer; }
    .btn-ghost:hover { border-color: var(--muted); color: var(--text); }
    .spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .65s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class CreateUserComponent implements OnInit {
  form!:     FormGroup;
  loading     = signal(false);
  serverError = signal('');
  successMsg  = signal('');
  showPwd     = signal(false);
  clients     = signal<Client[]>([]);

  roles = [
    { value: 'admin',      icon: '🛡️',  label: 'Admin',      desc: 'Full access' },
    { value: 'technician', icon: '🔧',  label: 'Technician', desc: 'Assigned sites' },
    { value: 'client',     icon: '👤',  label: 'Client',     desc: 'Read-only view'   },
  ];

  private selectedClientIds: Set<number> = new Set();

  constructor(
    private fb:    FormBuilder,
    private users: UserService,
    private http:  HttpClient,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.nonNullable.group(
      {
        name:             ['', Validators.required],
        username:         ['', Validators.required],
        email:            [''],
        role:             ['technician', Validators.required],
        ssi_access_level: [''],
        password:         ['', [Validators.required, Validators.minLength(8)]],
        confirm:          ['', Validators.required],
      },
      { validators: this.passwordMatchValidator }
    );

    this.http
      .get<{ clients: Client[] }>(`${environment.apiUrl}/admin/clients`)
      .subscribe({ next: r => this.clients.set(r.clients || []), error: () => {} });
  }

  private passwordMatchValidator(g: AbstractControl): ValidationErrors | null {
    const pw  = g.get('password')?.value;
    const cfm = g.get('confirm')?.value;
    return pw && cfm && pw !== cfm ? { mismatch: true } : null;
  }

  isErr(field: string): boolean {
    const c = this.form.get(field);
    if (field === 'confirm') {
      return !!(c?.touched && (c?.invalid || this.form.errors?.['mismatch']));
    }
    return !!(c?.invalid && c?.touched);
  }

  setRole(value: string): void {
    this.form.get('role')?.setValue(value);
    this.selectedClientIds.clear();
  }

  onClientToggle(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) this.selectedClientIds.add(id);
    else         this.selectedClientIds.delete(id);
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading.set(true);
    this.serverError.set('');
    this.successMsg.set('');

    const { name, username, email, role, ssi_access_level, password } = this.form.getRawValue();

    const payload: CreateUserPayload = {
      name,
      username,
      password,
      role: role as CreateUserPayload['role'],
      ...(email && { email }),
      ...(ssi_access_level && { ssi_access_level }),
      ...(this.selectedClientIds.size > 0 && { client_ids: [...this.selectedClientIds] }),
    };

    this.users.createUser(payload).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        
        const targetName = res?.user?.name || res?.name || name;
        
        this.successMsg.set(
          `✓ The account for "${targetName}" has been successfully created.`
        );
        
        window.scrollTo({ top: 0, behavior: 'smooth' });

        setTimeout(() => {
          this.form.reset({ role: 'technician' });
          this.selectedClientIds.clear();
          this.router.navigate(['/admin/users']);
        }, 2200);
      },
      error: (err) => {
        this.loading.set(false);
        this.serverError.set(
          err.error?.message ?? 'An error occurred while creating the account.'
        );
      },
    });
  }
}