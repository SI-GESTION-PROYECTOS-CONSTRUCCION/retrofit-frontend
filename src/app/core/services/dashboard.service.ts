import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ProjectDashboardResponseDto } from '../models/dashboard.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/dashboard`
  
  getProjectDashboard(projectId: number): Observable<ProjectDashboardResponseDto> {
    return this.http.get<ProjectDashboardResponseDto>(`${this.apiUrl}/project/${projectId}`);
  }
}
