import { Routes } from '@angular/router';
import { APP_ROUTES } from './core/constants/routes.constants';
import { authGuard } from './core/guards/auth-guard';
import { guestGuard } from './core/guards/guest-guard';

export const routes: Routes = [
	{
		path: APP_ROUTES.AUTH.LOGIN,
		canActivate: [guestGuard],
		loadComponent: () =>
			import('./features/auth/pages/login-component/login-component').then((m) => m.LoginComponent),
	},
	{
		path: '',
		canActivate: [authGuard],
		loadComponent: () =>
			import('./shared/components/layout/main-layout/main-layout').then((m) => m.MainLayout),
		children: [
			{
				path: APP_ROUTES.DASHBOARD,
				loadComponent: () =>
					import('./features/dashboard/pages/dashboard/dashboard').then(
						(m) => m.DashboardComponent,
					),
			},
			{
				path: APP_ROUTES.AUDIT_LOG,
				loadComponent: () =>
					import('./features/audit-log/audit-log').then((m) => m.AuditLogComponent),
			},
			{
				path: APP_ROUTES.PORTFOLIO.LIST,
				loadComponent: () =>
					import('./features/projects/pages/project-list/project-list').then((m) => m.ProjectList),
			},
			{
				path: APP_ROUTES.RESOURCES,
				loadComponent: () =>
					import('./features/resource-list-component/resource-list-component').then(
						(m) => m.ResourceListComponent,
					),
			},
			{
				path: APP_ROUTES.PORTFOLIO.PROJECT_DETAIL,
				loadComponent: () =>
					import(
						'./features/projects/pages/project-detail-component/project-detail-component'
					).then((m) => m.ProjectDetailComponent),
			},
			{
				path: APP_ROUTES.PORTFOLIO.DAILY_REPORT,
				loadComponent: () =>
					import('./features/projects/pages/daily-report-component/daily-report-component').then(
						(m) => m.DailyReportComponent,
					),
			},
			{
				path: APP_ROUTES.SECURITY.USERS,
				loadComponent: () =>
					import('./features/gestion-usuarios/gestion-usuarios').then(
						(m) => m.GestionUsuariosComponent,
					),
			},
			{
				path: APP_ROUTES.SECURITY.ROLES,
				loadComponent: () =>
					import('./features/auth/pages/role-list-component/role-list-component').then(
						(m) => m.RoleListComponent,
					),
			},
			{
				path: APP_ROUTES.SECURITY.WORKERS,
				loadComponent: () =>
					import('./features/gestion-workers/gestion-workers').then(
						(m) => m.GestionWorkersComponent,
					),
			},
			{
				path: APP_ROUTES.PROJECT_ASSIGNMENT,
				loadComponent: () =>
					import('./features/project-assignment/project-assignment').then(
						(m) => m.ProjectAssignmentComponent,
					),
			},
			{
				path: '',
				redirectTo: APP_ROUTES.DASHBOARD,
				pathMatch: 'full',
			},
		],
	},
	{
		path: '',
		redirectTo: APP_ROUTES.AUTH.LOGIN,
		pathMatch: 'full',
	},
	{
		path: '**',
		redirectTo: APP_ROUTES.AUTH.LOGIN,
	},
];
