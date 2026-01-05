import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, CauseImage, ContributionImage } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly baseUrl = environment.apiBaseUrl;

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

  createCauseWithImages(data: FormData): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/causes/with-images`, data);
  }

  updateCause(id: number, data: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/causes/${id}`, data);
  }

  deleteCause(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/causes/${id}`);
  }

  getCauseImages(id: number): Observable<ApiResponse<{ images: CauseImage[] }>> {
    return this.http.get<ApiResponse<{ images: CauseImage[] }>>(`${this.baseUrl}/causes/${id}/images`);
  }

  uploadCauseImages(id: number, files: File[]): Observable<ApiResponse<{ images: CauseImage[] }>> {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    return this.http.post<ApiResponse<{ images: CauseImage[] }>>(`${this.baseUrl}/causes/${id}/images`, formData);
  }

  replaceCauseImage(id: number, imageId: number, file: File): Observable<ApiResponse<CauseImage>> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.put<ApiResponse<CauseImage>>(`${this.baseUrl}/causes/${id}/images/${imageId}`, formData);
  }

  deleteCauseImage(id: number, imageId: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/causes/${id}/images/${imageId}`);
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

  createContributionWithImages(data: FormData): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/contributions/with-images`, data);
  }

  updateContribution(id: number, data: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/contributions/${id}`, data);
  }

  deleteContribution(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/contributions/${id}`);
  }

  getContributionImages(id: number): Observable<ApiResponse<{ images: ContributionImage[] }>> {
    return this.http.get<ApiResponse<{ images: ContributionImage[] }>>(`${this.baseUrl}/contributions/${id}/images`);
  }

  uploadContributionImages(id: number, files: File[]): Observable<ApiResponse<{ images: ContributionImage[] }>> {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    return this.http.post<ApiResponse<{ images: ContributionImage[] }>>(
      `${this.baseUrl}/contributions/${id}/images`,
      formData
    );
  }

  replaceContributionImage(id: number, imageId: number, file: File): Observable<ApiResponse<ContributionImage>> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.put<ApiResponse<ContributionImage>>(
      `${this.baseUrl}/contributions/${id}/images/${imageId}`,
      formData
    );
  }

  deleteContributionImage(id: number, imageId: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/contributions/${id}/images/${imageId}`);
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
