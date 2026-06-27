// src/app/features/admin/admin.routes.ts
// All routes here are already protected by authGuard + roleGuard(['admin'])
// declared in the parent (app.routes.ts).

import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './admin-layout.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/dashboard.component')
            .then(m => m.AdminDashboardComponent),
      },
      {
        path: 'gateways',
        loadComponent: () =>
          import('./gateways/gateways.component')
            .then(m => m.GatewaysComponent),
      },
      {
        path: 'clients',
        loadComponent: () =>
          import('./clients/clients.component')
            .then(m => m.ClientsComponent),
      },

      // ── User management (replaces the old public /auth/signup)
      {
        path: 'users',
        loadComponent: () =>
          import('./users/users.component')
            .then(m => m.UsersComponent),
      },
      {
        path: 'users/create',                  // ← new protected route
        loadComponent: () =>
          import('./users/create/create-user.component')
            .then(m => m.CreateUserComponent),
      },

      {
        path: 'events',
        loadComponent: () =>
          import('./events/events.component')
            .then(m => m.EventsComponent),
      },
    ],
  },
];