import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { signal } from '@angular/core';

// Simple loading state service
class LoadingService {
  isLoading = signal<boolean>(false);
  requestCount = 0;

  start(): void {
    this.requestCount++;
    this.isLoading.set(true);
  }

  stop(): void {
    this.requestCount--;
    if (this.requestCount <= 0) {
      this.requestCount = 0;
      this.isLoading.set(false);
    }
  }
}

export const loadingService = new LoadingService();

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  loadingService.start();

  return next(req).pipe(
    finalize(() => {
      loadingService.stop();
    })
  );
};

