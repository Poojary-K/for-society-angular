import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ContributionsService } from '../../../core/services/contributions.service';
import { CardComponent } from '../../../shared/components/card/card.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { EditMemberComponent } from '../edit-member/edit-member.component';
import { Member, Contribution } from '../../../core/models';

@Component({
  selector: 'app-member-detail',
  standalone: true,
  imports: [CommonModule, CardComponent, ButtonComponent, EditMemberComponent],
  templateUrl: './member-detail.component.html',
  styleUrl: './member-detail.component.scss'
})
export class MemberDetailComponent implements OnInit {
  @ViewChild(EditMemberComponent) editMemberModal?: EditMemberComponent;
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private contributionsService = inject(ContributionsService);

  member = signal<Member | null>(null);
  contributions = signal<Contribution[]>([]);
  loading = signal<boolean>(true);

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadMember(parseInt(id, 10));
    }
  }

  loadMember(id: number): void {
    this.loading.set(true);
    this.apiService.getMemberById(id).subscribe({
      next: (response) => {
        if (response.success) {
          this.member.set(response.data);
          this.loadContributions(id);
        } else {
          this.toastService.show('Failed to load member', 'error');
          this.router.navigate(['/members']);
        }
        this.loading.set(false);
      },
      error: () => {
        this.toastService.show('Failed to load member', 'error');
        this.loading.set(false);
        this.router.navigate(['/members']);
      },
    });
  }

  loadContributions(memberId: number): void {
    this.contributionsService.getContributions().subscribe({
      next: () => {
        const contributionsSub = this.contributionsService.contributions$.subscribe((contributions) => {
          this.contributions.set(contributions.filter(c => c.memberid === memberId));
        });
        contributionsSub.unsubscribe();
      }
    });
  }

  getTotalContributions(): number {
    return this.contributions().reduce((sum, c) => sum + parseFloat(c.amount), 0);
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

  editMember(): void {
    this.editMemberModal?.open();
  }

  onMemberUpdated(updatedMember: Member): void {
    this.member.set(updatedMember);
    this.updateCurrentUser(updatedMember);
  }

  deleteMember(): void {
    const member = this.member();
    if (!member) return;

    if (confirm(`Are you sure you want to delete member "${member.name}"? This action cannot be undone.`)) {
      this.apiService.deleteMember(member.memberid).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.show('Member deleted successfully', 'success');
            this.router.navigate(['/members']);
          } else {
            this.toastService.show('Failed to delete member', 'error');
          }
        },
        error: () => {
          this.toastService.show('Failed to delete member', 'error');
        },
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/members']);
  }

  private updateCurrentUser(updatedMember: Member): void {
    const currentUser = this.authService.currentUser();
    if (currentUser && currentUser.memberId === updatedMember.memberid) {
      const updatedUser = {
        ...currentUser,
        name: updatedMember.name,
        email: updatedMember.email,
        phone: updatedMember.phone,
        isAdmin: !!updatedMember.is_admin,
        joinedOn: updatedMember.joinedon,
      };
      this.authService.currentUser.set(updatedUser);
      this.authService.isAdmin.set(updatedUser.isAdmin || false);
      localStorage.setItem('user_data', JSON.stringify(updatedUser));
    }
  }
}
