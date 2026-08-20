import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { guestGuard } from './core/guards/guest-guard';

export const routes: Routes = [
{
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/pages/login-component/login-component').then(m => m.LoginComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/components/layout/main-layout/main-layout').then(m => m.MainLayout),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/pages/dashboard/dashboard').then(m => m.DashboardComponent)
      },
      {
        path: 'auditLog',
        loadComponent: () => import('./features/audit-log/audit-log').then(m => m.AuditLogComponent)
      },
      {
        path: 'portafolio',
        loadComponent: () => import('./features/projects/pages/project-list/project-list').then(m => m.ProjectList)
      },
      {
        path: 'recursos',
        loadComponent: () => import('./features/resource-list-component/resource-list-component').then(m => m.ResourceListComponent)
      },
      {
        path: 'portafolio/proyecto/:code',
        loadComponent: () => import('./features/projects/pages/project-detail-component/project-detail-component').then(m => m.ProjectDetailComponent)
      },
      { 
        path: 'portafolio/proyecto/:id/daily-report',
        loadComponent: () => import('./features/projects/pages/daily-report-component/daily-report-component').then(m => m.DailyReportComponent)
      },
      {
        path: 'gestionUsuarios',
        loadComponent: () => import('./features/gestion-usuarios/gestion-usuarios').then(m => m.GestionUsuariosComponent)
      },
      {
        path: 'roles',
        loadComponent: () => import('./features/auth/pages/role-list-component/role-list-component').then(m => m.RoleListComponent)
      },
      {
        path: 'gestionTrabajadores',
        loadComponent: () => import('./features/gestion-workers/gestion-workers').then(m => m.GestionWorkersComponent)
      },
      {
        path: 'asignacionProyectos',
        loadComponent: () => import('./features/project-assignment/project-assignment').then(m => m.ProjectAssignmentComponent)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
