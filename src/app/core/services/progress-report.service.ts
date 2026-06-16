import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GroupedProgressReportDto, ProgressReportRequestDto, ProgressReportResponseDto } from '../models/project.model';

@Injectable({ providedIn: 'root' })
export class ProgressReportService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/progress-reports`;

  createReport(dto: ProgressReportRequestDto, files: File[]): Observable<any> {
    const formData = new FormData();
    
    formData.append('reportData', new Blob([JSON.stringify(dto)], { type: 'application/json' }));

    files.forEach(file => {
      formData.append('files', file, file.name);
    });

    return this.http.post(this.apiUrl, formData, { responseType: 'text' });
  }

  getReportsByProject(projectId: number, filters?: any): Observable<GroupedProgressReportDto[]> {
    let params = new HttpParams();
    
    if (filters?.startDate) params = params.set('startDate', filters.startDate);
    if (filters?.endDate) params = params.set('endDate', filters.endDate);
    if (filters?.itemCode) params = params.set('itemCode', filters.itemCode);

    return this.http.get<GroupedProgressReportDto[]>(`${this.apiUrl}/project/${projectId}`, { params });
  }

  downloadProgressReport(projectId: number, filters?: any): Observable<Blob> {
    let params = new HttpParams();
    
    if (filters?.startDate) params = params.set('startDate', filters.startDate);
    if (filters?.endDate) params = params.set('endDate', filters.endDate);
    if (filters?.itemCode) params = params.set('itemCode', filters.itemCode);

    // Call the specific report endpoint in ReportController
    return this.http.get(`${environment.apiUrl}/projects/${projectId}/reports/avances`, { params, responseType: 'blob' });
  }
}