import { Routes } from '@angular/router';
import { TechnicianLayoutComponent } from './technician-layout.component';

export const TECHNICIAN_ROUTES: Routes = [
  {
    path: '',
    component: TechnicianLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/dashboard.component').then(m => m.TechnicianDashboardComponent),
      },
      {
        path: 'sites',
        loadComponent: () =>
          import('./sites/sites.component').then(m => m.SitesComponent),
      },
      {
        path: 'interventions',
        loadComponent: () =>
          import('./interventions/interventions.component').then(m => m.InterventionsComponent),
      },
    ],
  },
];
