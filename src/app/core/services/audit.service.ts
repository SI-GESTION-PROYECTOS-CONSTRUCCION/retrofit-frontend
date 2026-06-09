import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuditLog } from '../models/auditLog.model';

@Injectable({
  providedIn: 'root',
})
export class AuditService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/audit`;
  
  getStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats`);
  }

  getLogs(page: number, size: number, search: string, module: string, action: string, date: string): Observable<any> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (search && search.trim() !== '') params = params.set('search', search.trim());
    if (module && module !== 'Todos') params = params.set('module', module);
    if (action && action !== 'Todas') params = params.set('action', action);
    if (date) params = params.set('date', date);

    return this.http.get<any>(this.apiUrl, { params });
  }
}