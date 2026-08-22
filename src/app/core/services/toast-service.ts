import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastMessage {
	message: string;
	type: 'success' | 'error' | 'warning';
}

@Injectable({
	providedIn: 'root',
})
export class ToastService {
	private toastSubject = new BehaviorSubject<ToastMessage | null>(null);
	public toast$ = this.toastSubject.asObservable();

	show(message: string, type: 'success' | 'error' | 'warning') {
		this.toastSubject.next({ message, type });

		setTimeout(() => {
			this.toastSubject.next(null);
		}, 4000);
	}

	showApiError(err: unknown, defaultMessage: string = 'Ocurrió un error inesperado') {
		let msg = defaultMessage;

		if (err instanceof HttpErrorResponse) {
			if (err.error) {
				if (typeof err.error === 'string') {
					msg = err.error;
				} else if (typeof err.error === 'object') {
					// Narrowing for custom error shapes from the backend
					const errorObj = err.error as {
						general?: unknown;
						message?: unknown;
						[key: string]: unknown;
					};
					if (typeof errorObj.general === 'string') {
						msg = errorObj.general;
					} else if (typeof errorObj.message === 'string') {
						msg = errorObj.message;
					} else {
						const values = Object.values(errorObj);
						if (values.length > 0 && typeof values[0] === 'string') {
							msg = values[0];
						}
					}
				}
			} else if (err.message) {
				msg = err.message;
			}
		} else if (err instanceof Error) {
			msg = err.message;
		}

		this.show(msg, 'error');
	}
}
