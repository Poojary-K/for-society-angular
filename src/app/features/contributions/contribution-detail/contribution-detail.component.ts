import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { CardComponent } from '../../../shared/components/card/card.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { EditContributionComponent } from '../edit-contribution/edit-contribution.component';
import { ContributionsService } from '../../../core/services/contributions.service';
import { Contribution, Member } from '../../../core/models';

@Component({
  selector: 'app-contribution-detail',
  standalone: true,
  imports: [CommonModule, CardComponent, ButtonComponent, EditContributionComponent],
  templateUrl: './contribution-detail.component.html',
  styleUrl: './contribution-detail.component.scss'
})
export class ContributionDetailComponent implements OnInit {
  @ViewChild(EditContributionComponent) editContributionModal?: EditContributionComponent;
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private contributionsService = inject(ContributionsService);

  contribution = signal<Contribution | null>(null);
  member = signal<Member | null>(null);
  members = signal<Member[]>([]);
  loading = signal<boolean>(true);
  loadingMembers = signal<boolean>(false);

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
          this.loadMembers(response.data.memberid);
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

  loadMembers(memberId: number): void {
    if (!memberId) {
      this.members.set([]);
      return;
    }

    // Non-admins can only edit their own contribution, so restrict the list
    if (!this.isAdmin) {
      const user = this.currentUser;
      if (user) {
        this.members.set([
          {
            memberid: user.memberId,
            name: user.name,
            email: user.email,
            phone: user.phone,
            password: '',
            joinedon: user.joinedOn,
            is_admin: user.isAdmin,
          },
        ]);
      } else {
        this.members.set([
          {
            memberid: memberId,
            name: `Member #${memberId}`,
            email: null,
            phone: null,
            password: '',
            joinedon: '',
          },
        ]);
      }
      return;
    }

    this.loadingMembers.set(true);
    this.apiService.getMembers().subscribe({
      next: (response) => {
        if (response.success) {
          this.members.set(response.data.members || []);
        }
        this.loadingMembers.set(false);
      },
      error: () => {
        this.loadingMembers.set(false);
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
    if (this.editContributionModal) {
      // Ensure member list is ready before opening
      if (this.members().length === 0 && this.contribution()) {
        this.loadMembers(this.contribution()!.memberid);
      }
      this.editContributionModal.open();
    }
  }

  onContributionUpdated(updatedContribution: Contribution): void {
    this.contribution.set(updatedContribution);
    this.contributionsService.updateContribution(updatedContribution);
    if (this.isAdmin) {
      this.loadMember(updatedContribution.memberid);
    }
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
