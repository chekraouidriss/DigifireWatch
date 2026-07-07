// src/app/features/admin/admin.routes.ts
import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard.component').then(m => m.AdminDashboardComponent),
      },
      {
        path: 'gateways',
        loadComponent: () => import('./gateways/gateways.component').then(m => m.GatewaysComponent),
      },
      {
        path: 'clients',
        loadComponent: () => import('./clients/clients.component').then(m => m.ClientsComponent),
      },
      {
        path: 'events',
        loadComponent: () => import('./events/events.component').then(m => m.EventsComponent),
      },
      {
        path: 'users',
        loadComponent: () => import('./users/users.component').then(m => m.UsersComponent),
      },
      {
        path: 'users/create',
        loadComponent: () => import('./users/create/create-user.component').then(m => m.CreateUserComponent),
      },
    ],
  },
];