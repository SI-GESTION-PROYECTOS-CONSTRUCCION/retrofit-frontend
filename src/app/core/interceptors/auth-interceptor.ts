import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthResponse } from '../models/auth.model';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast-service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
	const toastService = inject(ToastService);
	const authService = inject(AuthService);
	const router = inject(Router);

	const token = authService.getToken();
	let requestToForward = req;

	if (token) {
		requestToForward = req.clone({
			headers: req.headers.set('Authorization', `Bearer ${token}`),
		});
	}

	return next(requestToForward).pipe(
		catchError((error: HttpErrorResponse) => {
			if (req.url.includes('/auth/login') || req.url.includes('/auth/refresh')) {
				return throwError(() => error);
			}

			if (error.status === 403) {
				toastService.show('No tienes los permisos necesarios para realizar esta acción.', 'error');
			} else if (error.status === 401) {
				if (!isRefreshing) {
					isRefreshing = true;
					refreshTokenSubject.next(null);

					return authService.refreshToken().pipe(
						switchMap((res: AuthResponse | null) => {
							if (!res) {
								return throwError(() => new Error('No refresh token available'));
							}
							isRefreshing = false;
							refreshTokenSubject.next(res.jwt);
							return next(
								req.clone({
									headers: req.headers.set('Authorization', `Bearer ${res.jwt}`),
								}),
							);
						}),
						catchError((err) => {
							isRefreshing = false;
							toastService.show('Tu sesión ha expirado. Vuelve a ingresar.', 'error');
							authService.logout();
							router.navigate(['/login']);
							return throwError(() => err);
						}),
					);
				} else {
					return refreshTokenSubject.pipe(
						filter((token) => token != null),
						take(1),
						switchMap((jwt) => {
							return next(
								req.clone({
									headers: req.headers.set('Authorization', `Bearer ${jwt}`),
								}),
							);
						}),
					);
				}
			}

			return throwError(() => error);
		}),
	);
};
