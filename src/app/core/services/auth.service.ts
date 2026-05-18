import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private userPermissions = new Set<string>();
  private isLoaded = false;
  constructor(private http: HttpClient) { }


  loadUserProfile(): Observable<any> {
    if (this.isLoaded) {
      return of({ permissions: Array.from(this.userPermissions) });
    }

    return this.http.get<any>(`${this.apiUrl}/profile`).pipe(
      tap(profile => {
        this.userPermissions = new Set(profile.permissions);
        this.isLoaded = true; 
      })
    );
  }

  hasPermission(permission: string): boolean {
    return this.userPermissions.has(permission);
  }

  login(credenciales: { username: string; password: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credenciales);
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
    this.userPermissions.clear();
    this.isLoaded = false;
  }
}
