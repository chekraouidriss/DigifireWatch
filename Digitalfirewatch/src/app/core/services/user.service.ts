// src/app/core/services/user.service.ts
// Manages user accounts via the admin-only API.
// All methods require an admin JWT — the JWT interceptor attaches it automatically.
//
// IMPORTANT: createUser() returns only the created user object.
// It does NOT return or store a JWT, so the active admin session
// is completely untouched after account creation.

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';

export interface CreateUserPayload {
  username:           string;
  password:           string;
  name:               string;
  role:               'admin' | 'technician' | 'client';
  email?:             string;
  ssi_access_level?:  'I' | 'II' | 'III' | 'IV';
  client_ids?:        number[];
}

export interface UpdateUserPayload {
  name?:              string;
  role?:              string;
  email?:             string;
  password?:          string;
  client_ids?:        number[];
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly base = `${environment.apiUrl}/admin/users`;

  constructor(private http: HttpClient) {}

  /** List all users in the organisation */
  getAll(): Observable<User[]> {
    return this.http
      .get<{ users: User[] }>(this.base)
      .pipe(map(r => r.users));
  }

  /**
   * Create a new user account.
   * Returns the created User — never a token.
   * The active admin session is unaffected.
   */
  createUser(payload: CreateUserPayload): Observable<User> {
    return this.http
      .post<{ user: User }>(this.base, payload)
      .pipe(map(r => r.user));
  }

  /** Update an existing user */
  updateUser(id: number, payload: UpdateUserPayload): Observable<User> {
    return this.http
      .put<{ user: User }>(`${this.base}/${id}`, payload)
      .pipe(map(r => r.user));
  }

  /** Soft-delete a user */
  deleteUser(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/${id}`);
  }

  /** Reassign client access for a user */
  setClientAccess(userId: number, clientIds: number[]): Observable<void> {
    return this.http
      .post<void>(`${this.base}/${userId}/clients`, { client_ids: clientIds });
  }
}