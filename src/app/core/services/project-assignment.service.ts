import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectAssignmentDto } from '../models/projectAssignment';

@Injectable({
	providedIn: 'root',
})
export class ProjectAssignmentService {
	private http = inject(HttpClient);
	private apiUrl = `${environment.apiUrl}/project-assignments`;

	assignWorker(dto: ProjectAssignmentDto): Observable<ProjectAssignmentDto> {
		return this.http.post<ProjectAssignmentDto>(this.apiUrl, dto);
	}

	getActiveAssignments(): Observable<ProjectAssignmentDto[]> {
		return this.http.get<ProjectAssignmentDto[]>(`${this.apiUrl}/active`);
	}

	releaseWorker(id: number): Observable<void> {
		return this.http.patch<void>(`${this.apiUrl}/${id}/release`, {});
	}
}
