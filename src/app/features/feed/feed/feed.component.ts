import { Component, OnInit, OnDestroy, inject, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ContributionsService } from '../../../core/services/contributions.service';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { CardComponent } from '../../../shared/components/card/card.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { CreateCauseComponent } from '../../causes/create-cause/create-cause.component';
import { AddContributionComponent } from '../../contributions/add-contribution/add-contribution.component';
import { Contribution, Member, Cause } from '../../../core/models';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-feed',
  standalone: true,
  // Pie chart removed from feed summary (home page retains it)
  imports: [CommonModule, CardComponent, ButtonComponent, CreateCauseComponent, AddContributionComponent],
  templateUrl: './feed.component.html',
  styleUrl: './feed.component.scss',
})
export class FeedComponent implements OnInit, OnDestroy {
  private contributionsService = inject(ContributionsService);
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private subscription = new Subscription();

  @ViewChild(CreateCauseComponent) createCauseModal!: CreateCauseComponent;
  @ViewChild(AddContributionComponent) addContributionModal!: AddContributionComponent;

  contributions: Contribution[] = [];
  causes: Cause[] = [];
  members = signal<Member[]>([]);
  loading = true;
  showFabMenu = false;
  // showAll removed — feed shows recent (top 10) contributions only
  showContributionsOnly = signal<boolean>(false);

  fundStatus: any = null;
  donationsAllTime = false;
  
  donationsAmount(): number {
    // Prefer computed donations from causes for the current cycle (client-side)
    const causesTotal = this.getCurrentCycleCausesTotal();
    if (causesTotal > 0) {
      return causesTotal;
    }

    // Fallback to fundStatus donations (cycle-specific if provided, otherwise total)
    if (this.fundStatus && 'donationsThisCycle' in this.fundStatus) {
      return parseFloat(this.fundStatus.donationsThisCycle || '0');
    }
    if (this.fundStatus && this.fundStatus.totaldonations) {
      return parseFloat(this.fundStatus.totaldonations || '0');
    }
    return 0;
  }

  hasDonationsData(): boolean {
    return !!(this.fundStatus && (('donationsThisCycle' in this.fundStatus) || this.fundStatus.totaldonations));
  }

  getComparePercent(): number {
    const donations = this.donationsAmount();
    const contrib = this.getCurrentCycleTotal();
    const total = donations + contrib;
    return total > 0 ? Math.round((contrib / total) * 100) : 0;
  }

  getCurrentCycleCausesTotal(): number {
    return this.getCurrentCycleCauses().reduce((sum, c) => sum + (c.amount ? parseFloat(c.amount) : 0), 0);
  }

  private readonly donationCycleStartDay = this.normalizeStartDay(environment.donationCycleStartDay);

  get currentUser() {
    return this.authService.currentUser();
  }

  get isAdmin() {
    return this.authService.isAdmin();
  }

  ngOnInit(): void {
    // Subscribe to contributions from service
    const contributionsSub = this.contributionsService.contributions$.subscribe((contributions) => {
      this.contributions = contributions;
    });
    this.subscription.add(contributionsSub);

    // Subscribe to loading state
    const loadingSub = this.contributionsService.loading$.subscribe((loading) => {
      this.loading = loading;
    });
    this.subscription.add(loadingSub);

    // Load contributions (will use cache if available)
    this.contributionsService.getContributions().subscribe();

    // Load members to display member names
    this.apiService.getMembers().subscribe({
      next: (response) => {
        if (response.success) {
          this.members.set(response.data.members);
        }
      }
    });

    // Load causes so we can show current-cycle causes in feed
    this.apiService.getCauses().subscribe({
      next: (response) => {
        if (response.success) {
          this.causes = response.data.causes;
        }
      }
    });

    // Load fund status for chart
    this.apiService.getFundStatus().subscribe({
      next: (response) => {
        if (response.success) {
          this.fundStatus = response.data;
          // If backend provides donations this cycle explicitly, use it;
          // otherwise we'll fall back to total donations but mark as all-time.
          if (!('donationsThisCycle' in (this.fundStatus || {})) && this.fundStatus?.totaldonations) {
            this.donationsAllTime = true;
          }
        }
      }
    });

    // Attach scroll listener for toggling causes/contributions
    window.addEventListener('scroll', this.onScroll, { passive: true });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    window.removeEventListener('scroll', this.onScroll as EventListener);
  }

  private onScroll = (): void => {
    const causesList = document.querySelector('.causes-list');
    if (!causesList) return;
    const rect = causesList.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // If causes end is near or above bottom of viewport -> show contributions
    if (rect.bottom <= viewportHeight - 100) {
      if (!this.showContributionsOnly()) {
        this.showContributionsOnly.set(true);
      }
      return;
    }

    // If user scrolled back to top region -> show causes
    if (window.scrollY < 150 || rect.top >= 150) {
      if (this.showContributionsOnly()) {
        this.showContributionsOnly.set(false);
      }
    }
  }

  toggleFabMenu(): void {
    this.showFabMenu = !this.showFabMenu;
  }

  createCause(): void {
    this.showFabMenu = false;
    if (this.createCauseModal) {
      this.createCauseModal.open();
    }
  }

  addContribution(): void {
    this.showFabMenu = false;
    if (this.addContributionModal) {
      this.addContributionModal.open();
    }
  }

  onCauseCreated(): void {
    // Reload causes if needed (currently feed only shows contributions)
    // Could trigger a refresh of the landing page causes
  }

  onContributionAdded(): void {
    // Refresh contributions from service (will use cache if recent)
    this.contributionsService.refreshContributions();
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getMemberName(memberId: number): string {
    const member = this.members().find(m => m.memberid === memberId);
    return member?.name || `Member #${memberId}`;
  }

  viewContribution(contribution: Contribution): void {
    this.router.navigate(['/contributions', contribution.contributionid]);
  }

  getDisplayedContributions(): Contribution[] {
    const filtered = this.getCurrentCycleContributions();
    return filtered.slice(0, 10);
  }

  getCurrentCycleTotal(): number {
    return this.getCurrentCycleContributions().reduce((sum, c) => sum + parseFloat(c.amount), 0);
  }

  parseFloat(value: string): number {
    return parseFloat(value || '0');
  }

  public getCurrentCycleContributions(): Contribution[] {
    const { start, end } = this.getCycleRange(new Date(), this.donationCycleStartDay);
    return this.contributions.filter((c) => {
      const d = this.parseDateInput(c.contributeddate);
      return d ? this.isWithinRange(d, start, end) : false;
    });
  }

  getCurrentCycleCauses(): Cause[] {
    const { start, end } = this.getCycleRange(new Date(), this.donationCycleStartDay);
    return this.causes.filter((c) => {
      const d = this.parseDateInput(c.createdat);
      return d ? this.isWithinRange(d, start, end) : false;
    });
  }

  private parseDateInput(value: string): Date | null {
    if (!value) {
      return null;
    }
    const datePart = value.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) {
      return null;
    }
    return new Date(year, month - 1, day);
  }

  private normalizeStartDay(value: number | undefined): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return 1;
    }
    return Math.min(Math.max(Math.floor(value), 1), 31);
  }

  private getCycleRange(baseDate: Date, startDay: number): { start: Date; end: Date } {
    const currentMonthStart = this.getSafeDate(baseDate.getFullYear(), baseDate.getMonth(), startDay);
    const start = baseDate >= currentMonthStart
      ? currentMonthStart
      : this.getSafeDate(baseDate.getFullYear(), baseDate.getMonth() - 1, startDay);
    const end = this.getSafeDate(start.getFullYear(), start.getMonth() + 1, startDay);
    return { start, end };
  }

  private getSafeDate(year: number, monthIndex: number, day: number): Date {
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const clampedDay = Math.min(day, daysInMonth);
    return new Date(year, monthIndex, clampedDay);
  }

  private isWithinRange(date: Date, start: Date, end: Date): boolean {
    const time = date.getTime();
    return time >= start.getTime() && time < end.getTime();
  }

  viewCause(cause: Cause): void {
    this.router.navigate(['/causes', cause.causeid]);
  }

  editCause(cause: Cause, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/causes', cause.causeid]);
  }

  deleteCause(cause: Cause, event: Event): void {
    event.stopPropagation();
    if (confirm(`Are you sure you want to delete "${cause.title}"? This action cannot be undone.`)) {
      this.apiService.deleteCause(cause.causeid).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.show('Cause deleted successfully', 'success');
            // refresh causes in feed
            this.apiService.getCauses().subscribe({
              next: (r) => { if (r.success) { this.causes = r.data.causes; } }
            });
          } else {
            this.toastService.show('Failed to delete cause', 'error');
          }
        },
        error: () => {
          this.toastService.show('Failed to delete cause', 'error');
        }
      });
    }
  }

  formatAmount(amount: string | null): string {
    if (!amount) return 'Not specified';
    const num = parseFloat(amount);
    return `₹${num.toLocaleString('en-IN')}`;
  }

  editContribution(contribution: Contribution, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/contributions', contribution.contributionid]);
  }

  deleteContribution(contribution: Contribution, event: Event): void {
    event.stopPropagation();
    if (confirm(`Are you sure you want to delete this contribution of ₹${contribution.amount}? This action cannot be undone.`)) {
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

