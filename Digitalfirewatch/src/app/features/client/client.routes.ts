import { Routes } from '@angular/router';
import { ClientLayoutComponent } from './client-layout.component';

export const CLIENT_ROUTES: Routes = [
  {
    path: '',
    component: ClientLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/dashboard.component').then(m => m.ClientDashboardComponent),
      },
      {
        path: 'alerts',
        loadComponent: () =>
          import('./alerts/alerts.component').then(m => m.AlertsComponent),
      },
    ],
  },
];
