// src/app/core/models/user.model.ts

export type UserRole = 'admin' | 'technician' | 'client';

export interface User {
  id:              number;
  username:        string;
  role:            UserRole;
  name:            string;
  organization_id: number;
  client_ids?:     number[];
}

export interface AuthResponse {
  token: string;
  user:  User;
}

export interface LoginPayload {
  username: string;
  password: string;
}