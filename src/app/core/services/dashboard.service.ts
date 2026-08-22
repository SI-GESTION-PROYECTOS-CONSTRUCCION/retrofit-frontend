import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectDashboardResponseDto } from '../models/dashboard.model';

@Injectable({
	providedIn: 'root',
})
export class DashboardService {
	private http = inject(HttpClient);
	private apiUrl = `${environment.apiUrl}/dashboard`;

	getProjectDashboard(
		projectId: number,
		itemId?: number | null,
	): Observable<ProjectDashboardResponseDto> {
		let params = new HttpParams();
		if (itemId) {
			params = params.set('itemId', itemId.toString());
		}
		return this.http.get<ProjectDashboardResponseDto>(`${this.apiUrl}/project/${projectId}`, {
			params,
		});
	}
}
