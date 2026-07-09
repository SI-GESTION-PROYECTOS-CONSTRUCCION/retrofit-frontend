import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, switchMap, BehaviorSubject, filter, take } from 'rxjs';
import { ToastService } from '../services/toast-service'; 
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

let isRefreshing = false;
let refreshTokenSubject = new BehaviorSubject<any>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('retrofit_jwt');
  
  const toastService = inject(ToastService);
  const authService = inject(AuthService);
  const router = inject(Router);

  let requestToForward = req;

  if (token) {
    requestToForward = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
  }

  return next(requestToForward).pipe(
    catchError((error: HttpErrorResponse) => {
      
      if (req.url.includes('/auth/login') || req.url.includes('/auth/refresh')) {
        return throwError(() => error);
      }

      if (error.status === 403) {
        toastService.show('No tienes los permisos necesarios para realizar esta acción.', 'error');
      } 
      
      else if (error.status === 401) {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          return authService.refreshToken().pipe(
            switchMap((res: any) => {
              if (!res) {
                return throwError(() => new Error('No refresh token available'));
              }
              isRefreshing = false;
              refreshTokenSubject.next(res.jwt);
              return next(req.clone({
                headers: req.headers.set('Authorization', `Bearer ${res.jwt}`)
              }));
            }),
            catchError((err) => {
              isRefreshing = false;
              toastService.show('Tu sesión ha expirado. Vuelve a ingresar.', 'error');
              authService.logout();
              router.navigate(['/login']);
              return throwError(() => err);
            })
          );
        } else {
          return refreshTokenSubject.pipe(
            filter(token => token != null),
            take(1),
            switchMap(jwt => {
              return next(req.clone({
                headers: req.headers.set('Authorization', `Bearer ${jwt}`)
              }));
            })
          );
        }
      }

      return throwError(() => error);
    })
  );
};