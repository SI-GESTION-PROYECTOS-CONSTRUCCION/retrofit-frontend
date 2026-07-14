import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export const guestGuard: CanActivateFn = (route, state): Observable<boolean | UrlTree> | boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAutenticated()) {
    return true;
  }

  return authService.loadUserProfile().pipe(
    map(profile => {
      if (profile.requirePasswordChange) {
        return true;
      }
      return router.createUrlTree(['/dashboard']);
    }),
    catchError(() => {
      return of(true);
    })
  );
};