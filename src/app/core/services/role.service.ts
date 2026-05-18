import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // --- PERMISOS ---
  getAllPermissions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/permissions`);
  }

  // --- ROLES ---
  getAllRoles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/roles`);
  }

  createRole(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/roles`, data);
  }

  updateRole(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/roles/${id}`, data);
  }

  deleteRole(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/roles/${id}`);
  }
}