// src/app/core/services/auth.service.ts
//
// CHANGE: signup() has been removed.
// Account creation is now handled by UserService.createUser()
// which calls POST /api/admin/users (admin JWT required).
// This means calling createUser() never touches this service's
// internal state — the active admin session stays intact.

import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, AuthResponse, LoginPayload, UserRole } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'dfw_token';
  private readonly USER_KEY  = 'dfw_user';
  private readonly API       = environment.apiUrl;

  // ── Reactive state
  private _user   = signal<User | null>(this.loadUser());
  readonly user       = this._user.asReadonly();
  readonly isLoggedIn = computed(() => !!this._user());
  readonly role       = computed(() => this._user()?.role ?? null);
  readonly isAdmin    = computed(() => this._user()?.role === 'admin');
  readonly isTech     = computed(() => this._user()?.role === 'technician');
  readonly isClient   = computed(() => this._user()?.role === 'client');

  constructor(private http: HttpClient, private router: Router) {}

  // ── Login → POST /api/auth/login
  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.API}/auth/login`, payload)
      .pipe(tap(res => this.persist(res)));
  }

  // ── Logout
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this._user.set(null);
    this.router.navigate(['/auth/login']);
  }

  // ── Token accessor (used by JWT interceptor)
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  // ── Role check
  hasRole(roles: UserRole[]): boolean {
    const r = this._user()?.role;
    return r ? roles.includes(r) : false;
  }

  // ── Navigate to the correct dashboard after login
  navigateToDashboard(): void {
    const role = this._user()?.role;
    const map: Record<UserRole, string> = {
      admin:      '/admin/dashboard',
      technician: '/technician/dashboard',
      client:     '/client/dashboard',
    };
    this.router.navigate([map[role ?? 'client'] ?? '/auth/login']);
  }

  // ── Persist JWT + user to localStorage
  private persist(res: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, res.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
    this._user.set(res.user);
  }

  private loadUser(): User | null {
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }
}