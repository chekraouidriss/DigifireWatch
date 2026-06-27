// src/app/features/auth/auth.routes.ts
// Public routes — accessible only when NOT authenticated (noAuthGuard on parent).
// /auth/signup has been permanently removed from this module.

import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login.component').then(m => m.LoginComponent),
  },
  // Account creation: /admin/users/create  (admin JWT required)
];