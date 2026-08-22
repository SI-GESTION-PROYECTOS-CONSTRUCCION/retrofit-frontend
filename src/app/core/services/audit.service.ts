import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuditLog } from '../models/auditLog.model';
import { AuditStats } from '../models/auditStats.model';
import { Page } from '../models/page.model';

@Injectable({
  providedIn: 'root',
})
export class AuditService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/audit`;

  getStats(): Observable<AuditStats> {
    return this.http.get<AuditStats>(`${this.apiUrl}/stats`);
  }

  getLogs(
    page: number,
    size: number,
    search: string,
    module: string,
    action: string,
    date: string,
  ): Observable<Page<AuditLog>> {
    let params = new HttpParams().set('page', page).set('size', size);

    if (search && search.trim() !== '') {
      params = params.set('search', search.trim());
    }
    if (module && module !== 'Todos') {
      params = params.set('module', module);
    }
    if (action && action !== 'Todas') {
      params = params.set('action', action);
    }
    if (date) {
      params = params.set('date', date);
    }

    return this.http.get<Page<AuditLog>>(this.apiUrl, { params });
  }
}