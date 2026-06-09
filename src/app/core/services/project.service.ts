import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { ProjectRequestDto, ProjectResponseDto } from '../models/project.model';
import { Page } from '../models/page.model';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/projects`;

  getProjects(page: number = 0, size: number = 5, search?: string, priority?: string, status?: string): Observable<Page<ProjectResponseDto>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    if (search) params = params.set('search', search);
    if (priority) params = params.set('priority', priority);
    if (status) params = params.set('status', status);
      
    return this.http.get<Page<ProjectResponseDto>>(this.apiUrl, { params });
  }

  createProject(dto: ProjectRequestDto): Observable<ProjectResponseDto> {
    return this.http.post<ProjectResponseDto>(this.apiUrl, dto);
  }

  getStatuses(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/filters/statuses`);
  }

  getPriorities(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/filters/priorities`);
  }

  updateProject(id: number, dto: ProjectRequestDto): Observable<ProjectResponseDto> {
    return this.http.put<ProjectResponseDto>(`${this.apiUrl}/${id}`, dto);
  }

  saveApuDetails(projectItemId: number, laborYield: number, equipmentYield: number, resources: any[]): Observable<any> {
    const url = `${this.apiUrl}/project-items/${projectItemId}/apu?laborYield=${laborYield}&equipmentYield=${equipmentYield}`;
    return this.http.put<any>(url, resources);
  }

  downloadApuReport(projectId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${projectId}/reports/apu`, { responseType: 'blob' });
  }

  deleteProject(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getProjectById(id: number): Observable<ProjectResponseDto> {
    return this.http.get<ProjectResponseDto>(`${this.apiUrl}/${id}`);
  }

  getProjectByCode(code: string): Observable<ProjectResponseDto> {
    return this.http.get<ProjectResponseDto>(`${this.apiUrl}/code/${code}`);
  }
}
