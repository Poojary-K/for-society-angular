import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { CardComponent } from '../../../shared/components/card/card.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { Contribution, Member } from '../../../core/models';

@Component({
  selector: 'app-contribution-detail',
  standalone: true,
  imports: [CommonModule, CardComponent, ButtonComponent],
  templateUrl: './contribution-detail.component.html',
  styleUrl: './contribution-detail.component.scss'
})
export class ContributionDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  contribution = signal<Contribution | null>(null);
  member = signal<Member | null>(null);
  loading = signal<boolean>(true);
  showEditForm = signal<boolean>(false);

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  get currentUser() {
    return this.authService.currentUser();
  }

  get canEdit(): boolean {
    const contrib = this.contribution();
    if (!contrib || !this.currentUser) return this.isAdmin;
    return this.isAdmin || contrib.memberid === this.currentUser.memberId;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadContribution(parseInt(id, 10));
    }
  }

  loadContribution(id: number): void {
    this.loading.set(true);
    this.apiService.getContributionById(id).subscribe({
      next: (response) => {
        if (response.success) {
          this.contribution.set(response.data);
          // Load member info if admin
          if (this.isAdmin && response.data.memberid) {
            this.loadMember(response.data.memberid);
          }
        } else {
          this.toastService.show('Failed to load contribution', 'error');
          this.router.navigate(['/contributions']);
        }
        this.loading.set(false);
      },
      error: () => {
        this.toastService.show('Failed to load contribution', 'error');
        this.loading.set(false);
        this.router.navigate(['/contributions']);
      },
    });
  }

  loadMember(id: number): void {
    this.apiService.getMemberById(id).subscribe({
      next: (response) => {
        if (response.success) {
          this.member.set(response.data);
        }
      },
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  formatAmount(amount: string): string {
    const num = parseFloat(amount);
    return `₹${num.toLocaleString('en-IN')}`;
  }

  editContribution(): void {
    this.showEditForm.set(true);
  }

  deleteContribution(): void {
    const contribution = this.contribution();
    if (!contribution) return;

    if (confirm(`Are you sure you want to delete this contribution of ${this.formatAmount(contribution.amount)}? This action cannot be undone.`)) {
      this.apiService.deleteContribution(contribution.contributionid).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.show('Contribution deleted successfully', 'success');
            this.router.navigate(['/contributions']);
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

  goBack(): void {
    this.router.navigate(['/contributions']);
  }
}

