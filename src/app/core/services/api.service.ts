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

  getCauseById(id: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/causes/${id}`);
  }

  createCause(data: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/causes`, data);
  }

  updateCause(id: number, data: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/causes/${id}`, data);
  }

  deleteCause(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/causes/${id}`);
  }

  // Contributions
  getContributions(): Observable<ApiResponse<{ contributions: any[] }>> {
    return this.http.get<ApiResponse<{ contributions: any[] }>>(`${this.baseUrl}/contributions`);
  }

  getContributionById(id: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/contributions/${id}`);
  }

  createContribution(data: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/contributions`, data);
  }

  updateContribution(id: number, data: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/contributions/${id}`, data);
  }

  deleteContribution(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/contributions/${id}`);
  }

  // Members
  getMembers(): Observable<ApiResponse<{ members: any[] }>> {
    return this.http.get<ApiResponse<{ members: any[] }>>(`${this.baseUrl}/members`);
  }

  getMemberById(id: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/members/${id}`);
  }

  updateMember(id: number, data: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/members/${id}`, data);
  }

  deleteMember(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/members/${id}`);
  }

  // Funds
  getFundStatus(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/funds/status`);
  }
}

