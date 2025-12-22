import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Causes
  getCauses(): Observable<ApiResponse<{ causes: any[] }>> {
    return this.http.get<ApiResponse<{ causes: any[] }>>(`${this.baseUrl}/causes`);
  }

  createCause(data: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/causes`, data);
  }

  // Contributions
  getContributions(): Observable<ApiResponse<{ contributions: any[] }>> {
    return this.http.get<ApiResponse<{ contributions: any[] }>>(`${this.baseUrl}/contributions`);
  }

  createContribution(data: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/contributions`, data);
  }

  // Members
  getMembers(): Observable<ApiResponse<{ members: any[] }>> {
    return this.http.get<ApiResponse<{ members: any[] }>>(`${this.baseUrl}/members`);
  }

  // Funds
  getFundStatus(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/funds/status`);
  }
}

