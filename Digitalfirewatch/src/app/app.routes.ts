// src/app/app.routes.ts
//
// SECURITY CHANGE:
//   /auth/signup has been removed from the public routing tree.
//   Account creation lives at /admin/users/create — protected by
//   authGuard + roleGuard(['admin']).

import { Routes } from '@angular/router';
import { authGuard }   from './core/guards/auth.guard';
import { roleGuard }   from './core/guards/role.guard';
import { noAuthGuard } from './core/guards/no-auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },

  // ── Public auth space (unauthenticated only)
  {
    path: 'auth',
    canActivate: [noAuthGuard],
    loadChildren: () =>
      import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },

  // ── Admin space
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] },
    loadChildren: () =>
      import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
  },

  // ── Technician space
  {
    path: 'technician',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['technician'] },
    loadChildren: () =>
      import('./features/technician/technician.routes').then(m => m.TECHNICIAN_ROUTES),
  },

  // ── Client space
  {
    path: 'client',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['client'] },
    loadChildren: () =>
      import('./features/client/client.routes').then(m => m.CLIENT_ROUTES),
  },

  // ── Unauthorized
  {
    path: 'unauthorized',
    loadComponent: () =>
      import('./shared/components/unauthorized/unauthorized.component')
        .then(m => m.UnauthorizedComponent),
  },

  { path: '**', redirectTo: '/auth/login' },
];