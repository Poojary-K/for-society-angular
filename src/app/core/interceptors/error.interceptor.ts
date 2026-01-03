import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const toastService = inject(ToastService);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Unauthorized - logout and redirect to login
        authService.logout();
        toastService.error('Session expired. Please login again.');
        router.navigate(['/']);
      } else if (error.status === 403) {
        const code = error.error?.details?.code;
        if (code !== 'EMAIL_NOT_VERIFIED') {
          toastService.error('You do not have permission to perform this action.');
        }
      } else if (error.status === 404) {
        toastService.error('Resource not found.');
      } else if (error.status >= 500) {
        toastService.error('Server error. Please try again later.');
      } else if (error.error?.message) {
        // Show backend error message
        const message = error.error.message || 'An error occurred';
        toastService.error(message);
      } else {
        toastService.error('An unexpected error occurred.');
      }

      return throwError(() => error);
    })
  );
};
