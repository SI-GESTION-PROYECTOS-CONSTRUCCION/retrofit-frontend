import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { WorkerDto } from '../models/worker.model';
import { Page } from '../models/page.model';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class WorkerService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/workers`;

  getWorkers(page: number = 0, size: number = 10, search: string = ''): Observable<Page<WorkerDto>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('search', search);
      
    return this.http.get<Page<WorkerDto>>(this.apiUrl, { params });
  }

  getAvailableWorkers(): Observable<WorkerDto[]> {
    return this.http.get<WorkerDto[]>(`${this.apiUrl}/available`);
  }

  createWorker(dto: any): Observable<WorkerDto> {
    return this.http.post<WorkerDto>(this.apiUrl, dto);
  }

  updateWorker(id: number, dto: any): Observable<WorkerDto> {
    return this.http.put<WorkerDto>(`${this.apiUrl}/${id}`, dto);
  }

  deleteWorker(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}