import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PermissionDto, RoleRequestDto, RoleResponseDto } from '../models/role.model';

@Injectable({
	providedIn: 'root',
})
export class RoleService {
	private http = inject(HttpClient);
	private apiUrl = environment.apiUrl;

	// --- PERMISOS ---
	getAllPermissions(): Observable<PermissionDto[]> {
		return this.http.get<PermissionDto[]>(`${this.apiUrl}/permissions`);
	}

	// --- ROLES ---
	getAllRoles(): Observable<RoleResponseDto[]> {
		return this.http.get<RoleResponseDto[]>(`${this.apiUrl}/roles`);
	}

	createRole(data: RoleRequestDto): Observable<RoleResponseDto> {
		return this.http.post<RoleResponseDto>(`${this.apiUrl}/roles`, data);
	}

	updateRole(id: number, data: RoleRequestDto): Observable<RoleResponseDto> {
		return this.http.put<RoleResponseDto>(`${this.apiUrl}/roles/${id}`, data);
	}

	deleteRole(id: number): Observable<void> {
		return this.http.delete<void>(`${this.apiUrl}/roles/${id}`);
	}
}
