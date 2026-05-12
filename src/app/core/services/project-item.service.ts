import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { ProjectItemDto } from '../models/project.model';

@Injectable({
  providedIn: 'root',
})
export class ProjectItemService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/projects`;

  getItems(projectId: number): Observable<ProjectItemDto[]> {
    return this.http.get<ProjectItemDto[]>(`${this.apiUrl}/${projectId}/items`);
  }

  saveBulkItems(projectId: number, items: ProjectItemDto[]): Observable<ProjectItemDto[]> {
    return this.http.post<ProjectItemDto[]>(`${this.apiUrl}/${projectId}/items/bulk`, items);
  }
}
