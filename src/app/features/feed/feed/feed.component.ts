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
import { Contribution, Member } from '../../../core/models';

@Component({
  selector: 'app-feed',
  standalone: true,
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
  members = signal<Member[]>([]);
  loading = true;
  showFabMenu = false;
  showAllContributions = signal<boolean>(false);

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
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
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
    if (this.showAllContributions()) {
      return this.contributions;
    }
    return this.contributions.slice(0, 10);
  }

  showAll(): void {
    this.showAllContributions.set(true);
  }

  showLess(): void {
    this.showAllContributions.set(false);
    // Scroll to top of contributions list
    const element = document.querySelector('.contributions-list');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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

