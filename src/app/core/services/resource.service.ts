import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
	ResourcePageResponseDto,
	ResourceRequestDto,
	ResourceResponseDto,
} from '../models/resource.model';

@Injectable({
	providedIn: 'root',
})
export class ResourceService {
	private http = inject(HttpClient);
	private apiUrl = environment.apiUrl;

	getResources(endpoint: string): Observable<ResourceResponseDto[]> {
		return this.http.get<ResourceResponseDto[]>(`${this.apiUrl}/${endpoint}`);
	}

	createResource(endpoint: string, data: ResourceRequestDto): Observable<ResourceResponseDto> {
		return this.http.post<ResourceResponseDto>(`${this.apiUrl}/${endpoint}`, data);
	}

	updateResource(
		endpoint: string,
		id: number,
		data: ResourceRequestDto,
	): Observable<ResourceResponseDto> {
		return this.http.put<ResourceResponseDto>(`${this.apiUrl}/${endpoint}/${id}`, data);
	}

	deleteResource(endpoint: string, id: number): Observable<void> {
		return this.http.delete<void>(`${this.apiUrl}/${endpoint}/${id}`);
	}

	getResourcesPaginated(
		page: number,
		size: number,
		search: string,
		type: string,
	): Observable<ResourcePageResponseDto> {
		return this.http.get<ResourcePageResponseDto>(`${this.apiUrl}/resources/paginated`, {
			params: {
				page: page.toString(),
				size: size.toString(),
				search: search,
				type: type,
			},
		});
	}
}
