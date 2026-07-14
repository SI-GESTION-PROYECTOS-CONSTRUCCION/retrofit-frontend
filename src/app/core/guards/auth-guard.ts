import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state): Observable<boolean | UrlTree> | boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAutenticated()) {
    return router.createUrlTree(['/login']);
  }

  return authService.loadUserProfile().pipe(
    map(profile => {
      if (profile.requirePasswordChange) {
        return router.createUrlTree(['/login']);
      }
      return true;
    }),
    catchError(() => {
      return of(router.createUrlTree(['/login']));
    })
  );
};
