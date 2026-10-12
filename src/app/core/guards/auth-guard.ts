import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { APP_ROUTES } from '../constants/routes.constants';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (): Observable<boolean | UrlTree> | boolean | UrlTree => {
	const authService = inject(AuthService);
	const router = inject(Router);

	if (!authService.isAutenticated()) {
		return router.createUrlTree(['/', APP_ROUTES.AUTH.LOGIN]);
	}

	return authService.loadUserProfile().pipe(
		map((profile) => {
			if (profile.requirePasswordChange) {
				return router.createUrlTree(['/', APP_ROUTES.AUTH.LOGIN]);
			}
			return true;
		}),
		catchError(() => {
			return of(router.createUrlTree(['/', APP_ROUTES.AUTH.LOGIN]));
		}),
	);
};
