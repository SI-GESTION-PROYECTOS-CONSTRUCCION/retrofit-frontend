import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginCredentials, UserProfile } from '../models/auth.model';

const JWT_KEY = 'retrofit_jwt';
const REFRESH_JWT_KEY = 'retrofit_refresh_jwt';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private userPermissions = new Set<string>();
  private requirePasswordChange = false;
  private isLoaded = false;
  private cachedProfile: UserProfile | null = null;

  constructor(private http: HttpClient) {}

  loadUserProfile(): Observable<UserProfile> {
    if (this.isLoaded && this.cachedProfile) {
      return of(this.cachedProfile);
    }

    return this.http.get<UserProfile>(`${this.apiUrl}/profile`).pipe(
      tap((profile) => {
        this.userPermissions = new Set(profile.permissions);
        this.requirePasswordChange = profile.requirePasswordChange;
        this.cachedProfile = profile;
        this.isLoaded = true;
      }),
    );
  }

  hasPermission(permission: string): boolean {
    return this.userPermissions.has(permission);
  }

  login(credenciales: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credenciales);
  }

  changePassword(newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/change-password`, { newPassword }).pipe(
      tap(() => {
        this.requirePasswordChange = false;
        if (this.cachedProfile) {
          this.cachedProfile.requirePasswordChange = false;
        }
      }),
    );
  }

  refreshToken(): Observable<AuthResponse | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return of(null);
    }
    return this.http.post<AuthResponse>(`${this.apiUrl}/refresh`, { refreshToken }).pipe(
      tap((res) => {
        if (res?.jwt) {
          this.saveToken(res.jwt);
          if (res?.refreshToken) {
            this.saveRefreshToken(res.refreshToken);
          }
        }
      }),
    );
  }

  saveToken(token: string): void {
    localStorage.setItem(JWT_KEY, token);
  }

  saveRefreshToken(token: string): void {
    localStorage.setItem(REFRESH_JWT_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(JWT_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_JWT_KEY);
  }

  isAutenticated(): boolean {
    const token = this.getToken();
    return token !== null;
  }

  logout(): void {
    localStorage.removeItem(JWT_KEY);
    localStorage.removeItem(REFRESH_JWT_KEY);
    this.userPermissions.clear();
    this.requirePasswordChange = false;
    this.isLoaded = false;
    this.cachedProfile = null;
  }
}
