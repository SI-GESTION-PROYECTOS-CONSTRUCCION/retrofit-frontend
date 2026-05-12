import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UserCreateDto, UserDto } from '../models/user.model';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page } from '../models/page.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/users`;

  getUsers(page: number = 0, size: number = 10, search?: string, roleName: string = 'ALL'): Observable<Page<UserDto>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('roleName', roleName);
    
    if (search) params = params.set('search', search);
      
    return this.http.get<Page<UserDto>>(this.apiUrl, { params });
  }

  registerUser(dto: UserCreateDto): Observable<UserDto> {
    return this.http.post<UserDto>(this.apiUrl, dto);
  }

  updateUser(id: number, dto: UserCreateDto): Observable<UserDto> {
    return this.http.put<UserDto>(`${this.apiUrl}/${id}`, dto);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
