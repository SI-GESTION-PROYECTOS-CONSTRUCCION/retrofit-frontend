import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AppPermission } from '../constants/permissions.constants';
import { APP_ROUTES } from '../constants/routes.constants';
import { AuthService } from '../services/auth.service';

export const permissionGuard: CanActivateFn = (
	route: ActivatedRouteSnapshot,
): Observable<boolean | UrlTree> | boolean | UrlTree => {
	const authService = inject(AuthService);
	const router = inject(Router);

	if (!authService.isAutenticated()) {
		return router.createUrlTree(['/', APP_ROUTES.AUTH.LOGIN]);
	}

	const requiredPermission = route.data?.['permission'] as keyof typeof AppPermission | undefined;
	if (!requiredPermission) {
		return true;
	}

	return authService.loadUserProfile().pipe(
		map(() => {
			if (authService.hasPermission(requiredPermission)) {
				return true;
			}
			// Si no tiene el permiso, denegar y redirigir al dashboard
			return router.createUrlTree(['/', APP_ROUTES.DASHBOARD]);
		}),
		catchError(() => {
			return of(router.createUrlTree(['/', APP_ROUTES.AUTH.LOGIN]));
		}),
	);
};
