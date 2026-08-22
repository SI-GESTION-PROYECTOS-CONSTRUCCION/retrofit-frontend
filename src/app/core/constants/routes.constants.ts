export const APP_ROUTES = {
	AUTH: {
		LOGIN: 'login',
	},
	DASHBOARD: 'dashboard',
	AUDIT_LOG: 'auditLog',
	PORTFOLIO: {
		LIST: 'portafolio',
		PROJECT_DETAIL: 'portafolio/proyecto/:code',
		DAILY_REPORT: 'portafolio/proyecto/:id/daily-report',
	},
	RESOURCES: 'recursos',
	SECURITY: {
		USERS: 'gestionUsuarios',
		WORKERS: 'gestionTrabajadores',
		ROLES: 'roles',
	},
	PROJECT_ASSIGNMENT: 'asignacionProyectos',
};
