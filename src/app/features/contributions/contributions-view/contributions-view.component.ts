import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ContributionsService } from '../../../core/services/contributions.service';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { CardComponent } from '../../../shared/components/card/card.component';
import { Contribution, Member } from '../../../core/models';

@Component({
  selector: 'app-contributions-view',
  standalone: true,
  imports: [CommonModule, CardComponent],
  templateUrl: './contributions-view.component.html',
  styleUrl: './contributions-view.component.scss'
})
export class ContributionsViewComponent implements OnInit, OnDestroy {
  private contributionsService = inject(ContributionsService);
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private subscriptions = new Subscription();

  contributions = signal<Contribution[]>([]);
  members = signal<Member[]>([]);
  loading = signal<boolean>(true);
  searchQuery = signal<string>('');
  filterDateFrom = signal<string>('');
  filterDateTo = signal<string>('');

  get currentUser() {
    return this.authService.currentUser();
  }

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  get filteredContributions(): Contribution[] {
    let filtered = this.contributions();
    const query = this.searchQuery().toLowerCase().trim();
    const fromDate = this.filterDateFrom();
    const toDate = this.filterDateTo();

    // Filter by search query (member name)
    if (query) {
      filtered = filtered.filter(contribution => {
        const member = this.getMemberById(contribution.memberid);
        return member?.name.toLowerCase().includes(query);
      });
    }

    // Filter by date range
    if (fromDate) {
      filtered = filtered.filter(contribution => {
        const contribDate = new Date(contribution.contributeddate);
        return contribDate >= new Date(fromDate);
      });
    }

    if (toDate) {
      filtered = filtered.filter(contribution => {
        const contribDate = new Date(contribution.contributeddate);
        return contribDate <= new Date(toDate);
      });
    }

    return filtered;
  }

  ngOnInit(): void {
    // Load contributions
    this.contributionsService.getContributions().subscribe();

    const contributionsSub = this.contributionsService.contributions$.subscribe((contributions) => {
      if (this.isAdmin) {
        this.contributions.set(contributions);
      } else {
        this.contributions.set(contributions.filter(c => c.memberid === this.currentUser?.memberId));
      }
    });
    this.subscriptions.add(contributionsSub);

    const loadingSub = this.contributionsService.loading$.subscribe((loading) => {
      this.loading.set(loading);
    });
    this.subscriptions.add(loadingSub);

    // Load members if admin (for displaying member names)
    if (this.isAdmin) {
      const membersSub = this.apiService.getMembers().subscribe({
        next: (response) => {
          if (response.success) {
            this.members.set(response.data.members);
          }
        }
      });
      this.subscriptions.add(membersSub);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  getMemberById(memberId: number): Member | undefined {
    return this.members().find(m => m.memberid === memberId);
  }

  getMemberName(memberId: number): string {
    const member = this.getMemberById(memberId);
    return member?.name || `Member #${memberId}`;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatAmount(amount: string): string {
    const num = parseFloat(amount);
    return `₹${num.toLocaleString('en-IN')}`;
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  onDateFromChange(date: string): void {
    this.filterDateFrom.set(date);
  }

  onDateToChange(date: string): void {
    this.filterDateTo.set(date);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.filterDateFrom.set('');
    this.filterDateTo.set('');
  }

  viewContribution(contribution: Contribution): void {
    this.router.navigate(['/contributions', contribution.contributionid]);
  }

  editContribution(contribution: Contribution, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/contributions', contribution.contributionid]);
  }

  deleteContribution(contribution: Contribution, event: Event): void {
    event.stopPropagation();
    if (confirm(`Are you sure you want to delete this contribution of ${this.formatAmount(contribution.amount)}? This action cannot be undone.`)) {
      this.apiService.deleteContribution(contribution.contributionid).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.show('Contribution deleted successfully', 'success');
            this.contributionsService.refreshContributions();
          } else {
            this.toastService.show('Failed to delete contribution', 'error');
          }
        },
        error: () => {
          this.toastService.show('Failed to delete contribution', 'error');
        },
      });
    }
  }
}
