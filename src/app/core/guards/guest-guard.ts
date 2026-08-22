import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = (): Observable<boolean | UrlTree> | boolean | UrlTree => {
	const authService = inject(AuthService);
	const router = inject(Router);

	if (!authService.isAutenticated()) {
		return true;
	}

	return authService.loadUserProfile().pipe(
		map((profile) => {
			if (profile.requirePasswordChange) {
				return true;
			}
			return router.createUrlTree(['/dashboard']);
		}),
		catchError(() => {
			return of(true);
		}),
	);
};
