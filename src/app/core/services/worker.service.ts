import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page } from '../models/page.model';
import { WorkerDto, WorkerRequestDto } from '../models/worker.model';

@Injectable({
	providedIn: 'root',
})
export class WorkerService {
	private http = inject(HttpClient);
	private apiUrl = `${environment.apiUrl}/workers`;

	getWorkers(
		page: number = 0,
		size: number = 10,
		search: string = '',
		active: string = '',
	): Observable<Page<WorkerDto>> {
		let params = new HttpParams()
			.set('page', page.toString())
			.set('size', size.toString())
			.set('search', search);

		if (active !== '') {
			params = params.set('active', active);
		}

		return this.http.get<Page<WorkerDto>>(this.apiUrl, { params });
	}

	getAvailableWorkers(): Observable<WorkerDto[]> {
		return this.http.get<WorkerDto[]>(`${this.apiUrl}/available`);
	}

	createWorker(dto: WorkerRequestDto): Observable<WorkerDto> {
		return this.http.post<WorkerDto>(this.apiUrl, dto);
	}

	updateWorker(id: number, dto: WorkerRequestDto): Observable<WorkerDto> {
		return this.http.put<WorkerDto>(`${this.apiUrl}/${id}`, dto);
	}

	deleteWorker(id: number): Observable<void> {
		return this.http.delete<void>(`${this.apiUrl}/${id}`);
	}
}
