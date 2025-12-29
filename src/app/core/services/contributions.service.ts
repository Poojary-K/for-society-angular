import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Contribution } from '../models/contribution.model';
import { ApiResponse } from '../models';

@Injectable({
  providedIn: 'root',
})
export class ContributionsService {
  private contributionsSubject = new BehaviorSubject<Contribution[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private lastFetchTime = 0;
  private readonly CACHE_DURATION = 5000; // 5 seconds cache

  contributions$ = this.contributionsSubject.asObservable();
  loading$ = this.loadingSubject.asObservable();

  contributions = signal<Contribution[]>([]);
  loading = signal<boolean>(false);

  constructor(private apiService: ApiService) {}

  getContributions(forceRefresh = false): Observable<ApiResponse<{ contributions: Contribution[] }>> {
    const now = Date.now();
    const shouldUseCache = !forceRefresh && (now - this.lastFetchTime) < this.CACHE_DURATION && this.contributions().length > 0;

    if (shouldUseCache) {
      // Return cached data
      return of({
        success: true,
        data: { contributions: this.contributions() },
      } as ApiResponse<{ contributions: Contribution[] }>);
    }

    // Fetch fresh data
    this.loading.set(true);
    this.loadingSubject.next(true);

    return this.apiService.getContributions().pipe(
      tap((response) => {
        if (response.success && response.data) {
          const contributions = response.data.contributions || [];
          // Remove duplicates based on contributionid
          const uniqueContributions = contributions.filter(
            (contrib, index, self) =>
              index === self.findIndex((c) => c.contributionid === contrib.contributionid)
          );
          this.contributions.set(uniqueContributions);
          this.contributionsSubject.next(uniqueContributions);
          this.lastFetchTime = Date.now();
        }
        this.loading.set(false);
        this.loadingSubject.next(false);
      }),
      shareReplay(1) // Share the result with multiple subscribers
    );
  }

  refreshContributions(): void {
    this.getContributions(true).subscribe();
  }

  addContribution(contribution: Contribution): void {
    const current = this.contributions();
    // Check if contribution already exists
    if (!current.find((c) => c.contributionid === contribution.contributionid)) {
      this.contributions.set([contribution, ...current]);
      this.contributionsSubject.next([contribution, ...current]);
    }
  }
}

