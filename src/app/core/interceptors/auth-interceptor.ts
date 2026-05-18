import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast-service'; 
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = sessionStorage.getItem('retrofit_jwt');
  
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
      
      if (error.status === 403) {
        toastService.show('No tienes los permisos necesarios para realizar esta acción.', 'error');
      } 
      
      else if (error.status === 401) {
        toastService.show('Tu sesión ha expirado. Vuelve a ingresar.', 'error');
        authService.logout();
        router.navigate(['/login']);
      }

      return throwError(() => error);
    })
  );
};