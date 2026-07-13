import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'warning';
}

@Injectable({
  providedIn: 'root'
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

  showApiError(err: any, defaultMessage: string = 'Ocurrió un error inesperado') {
    let msg = defaultMessage;
    
    if (err?.error) {
      if (typeof err.error === 'string') {
        msg = err.error;
      } else if (err.error.general) {
        msg = err.error.general;
      } else if (err.error.message) {
        msg = err.error.message;
      } else if (typeof err.error === 'object') {
        const values = Object.values(err.error);
        if (values.length > 0 && typeof values[0] === 'string') {
          msg = values[0];
        }
      }
    } else if (err?.message) {
      msg = err.message;
    }

    this.show(msg, 'error');
  }
}