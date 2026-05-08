import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UserDto } from '../models/user.model';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/users`;

  getUsersByRole(role: string): Observable<UserDto[]> {
    return this.http.get<UserDto[]>(`${this.apiUrl}?roleName=${role}`);
  }
}
