import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import { Router } from '@angular/router';
import {
  LoginRequest,
  RegisterRequest,
  LoginResponse,
  RegisterResponse,
  UpgradeToAdminRequest,
  UpgradeToAdminResponse,
  VerifyEmailResponse,
  User,
  ApiResponse,
} from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = `${environment.apiBaseUrl}/auth`;
  private readonly tokenKey = 'auth_token';
  private readonly userKey = 'user_data';

  // Signals for reactive state management
  currentUser = signal<User | null>(null);
  isAuthenticated = signal<boolean>(false);
  isAdmin = signal<boolean>(false);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadUserFromStorage();
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.apiUrl}/login`, credentials).pipe(
      tap((apiResponse) => {
        if (apiResponse.success && apiResponse.data) {
          const response = apiResponse.data;
          this.setAuthData(response.token, response.member);
        }
      }),
      map((apiResponse) => apiResponse.data)
    );
  }

  register(data: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<ApiResponse<RegisterResponse>>(`${this.apiUrl}/register`, data).pipe(
      tap((apiResponse) => {
        if (apiResponse.success && apiResponse.data) {
          const response = apiResponse.data;
          if (response.token && !response.verificationRequired) {
            this.setAuthData(response.token, {
              memberId: response.memberId,
              name: response.name,
              email: response.email,
              phone: response.phone,
              joinedOn: response.joinedOn,
              isAdmin: response.isAdmin,
            });
          }
        }
      }),
      map((apiResponse) => apiResponse.data)
    );
  }

  upgradeToAdmin(data: UpgradeToAdminRequest): Observable<UpgradeToAdminResponse> {
    return this.http.post<ApiResponse<UpgradeToAdminResponse>>(`${this.apiUrl}/upgrade-to-admin`, data).pipe(
      tap((apiResponse) => {
        if (apiResponse.success && apiResponse.data) {
          const response = apiResponse.data;
          this.setAuthData(response.token, response.member);
        }
      }),
      map((apiResponse) => apiResponse.data)
    );
  }

  verifyEmail(token: string): Observable<VerifyEmailResponse> {
    return this.http
      .get<ApiResponse<VerifyEmailResponse>>(`${this.apiUrl}/verify-email`, { params: { token } })
      .pipe(map((apiResponse) => apiResponse.data));
  }

  resendVerification(email: string): Observable<string> {
    return this.http
      .post<ApiResponse<null>>(`${this.apiUrl}/resend-verification`, { email })
      .pipe(map((apiResponse) => apiResponse.message || 'Verification email sent'));
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.isAdmin.set(false);
    this.router.navigate(['/']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private setAuthData(token: string, user: User): void {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.currentUser.set(user);
    this.isAuthenticated.set(true);
    this.isAdmin.set(user.isAdmin || false);
  }

  private loadUserFromStorage(): void {
    const token = localStorage.getItem(this.tokenKey);
    const userData = localStorage.getItem(this.userKey);

    if (token && userData) {
      try {
        const user: User = JSON.parse(userData);
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
        this.isAdmin.set(user.isAdmin || false);
      } catch (error) {
        console.error('Error parsing user data from storage:', error);
        this.logout();
      }
    }
  }
}
