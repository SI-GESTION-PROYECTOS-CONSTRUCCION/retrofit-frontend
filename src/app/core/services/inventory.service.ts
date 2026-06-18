import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment'; 
import { InventoryTransactionRequest, InventoryTransactionResponse, StockSummary } from '../models/inventory.model';
import { SupplyControl } from '../models/supply-control.model';
import { Page } from '../models/page.model';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/inventory`;

  /**
   * Registra un ingreso de material al almacén
   */
  registerInbound(request: InventoryTransactionRequest): Observable<InventoryTransactionResponse> {
    return this.http.post<InventoryTransactionResponse>(`${this.apiUrl}/inbound`, request);
  }

  /**
   * Registra una salida de material hacia una partida
   */
  registerOutbound(request: InventoryTransactionRequest): Observable<InventoryTransactionResponse> {
    return this.http.post<InventoryTransactionResponse>(`${this.apiUrl}/outbound`, request);
  }

  /**
   * Obtiene el stock físico actual de un recurso en un proyecto
   */
  getCurrentStock(projectId: number, resourceId: number): Observable<number> {
    const params = new HttpParams()
      .set('projectId', projectId.toString())
      .set('resourceId', resourceId.toString());

    return this.http.get<number>(`${this.apiUrl}/stock`, { params });
  }

  /**
   * Obtiene el historial completo (Kardex) de movimientos
   */
  getKardex(projectId: number, resourceId: number): Observable<InventoryTransactionResponse[]> {
    const params = new HttpParams()
      .set('projectId', projectId.toString())
      .set('resourceId', resourceId.toString());

    return this.http.get<InventoryTransactionResponse[]>(`${this.apiUrl}/kardex`, { params });
  }

  getProjectStockSummary(projectId: number, page: number = 0, size: number = 10): Observable<Page<StockSummary>> {
    const params = new HttpParams()
      .set('projectId', projectId.toString())
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<Page<StockSummary>>(`${this.apiUrl}/summary`, { params });
  }

  getPlannedMaterials(projectId: number): Observable<any[]> {
    const params = new HttpParams().set('projectId', projectId.toString());
    return this.http.get<any[]>(`${this.apiUrl}/planned-materials`, { params });
  }

  getSupplyControl(projectId: number, status?: string, resourceName?: string): Observable<SupplyControl[]> {
    let params = new HttpParams().set('projectId', projectId.toString());
    if (status) {
      params = params.set('status', status);
    }
    if (resourceName) {
      params = params.set('resourceName', resourceName);
    }
    return this.http.get<SupplyControl[]>(`${this.apiUrl}/supply-control`, { params });
  }

  getConsumedQuantity(projectItemId: number, resourceId: number, date?: string): Observable<number> {
    let params = new HttpParams()
      .set('projectItemId', projectItemId.toString())
      .set('resourceId', resourceId.toString());
    
    if (date) {
      params = params.set('date', date);
    }
    return this.http.get<number>(`${this.apiUrl}/consumed-quantity`, { params });
  }

  downloadInventoryReport(projectId: number): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/projects/${projectId}/reports/inventario`, { responseType: 'blob' });
  }
}