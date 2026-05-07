import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth/login`;

  constructor(private http: HttpClient) { }


  login(credenciales: { username: string; password: string }): Observable<any> {
    return this.http.post<any>(this.apiUrl, credenciales);
  }

  saveToken(token: string): void {
    sessionStorage.setItem('retrofit_jwt', token);
  }

  getToken(): string | null {
    return sessionStorage.getItem('retrofit_jwt');
  }

  isAutenticated(): boolean {
    const token = this.getToken();
    return token !== null;
  }

  logout(): void {
    sessionStorage.removeItem('retrofit_jwt');
  }
}
