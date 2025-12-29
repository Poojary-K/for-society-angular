import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { CardComponent } from '../../shared/components/card/card.component';
import { Member } from '../../core/models';

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [CommonModule, CardComponent],
  templateUrl: './members.component.html',
  styleUrl: './members.component.scss'
})
export class MembersComponent implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  members = signal<Member[]>([]);
  loading = signal<boolean>(true);
  searchQuery = signal<string>('');
  filterRole = signal<'all' | 'admin' | 'member'>('all');

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  get filteredMembers(): Member[] {
    let filtered = this.members();
    const query = this.searchQuery().toLowerCase().trim();
    const roleFilter = this.filterRole();

    // Filter by search query
    if (query) {
      filtered = filtered.filter(member =>
        member.name.toLowerCase().includes(query) ||
        (member.email && member.email.toLowerCase().includes(query)) ||
        (member.phone && member.phone.includes(query))
      );
    }

    // Filter by role
    if (roleFilter === 'admin') {
      filtered = filtered.filter(member => member.is_admin);
    } else if (roleFilter === 'member') {
      filtered = filtered.filter(member => !member.is_admin);
    }

    return filtered;
  }

  ngOnInit(): void {
    this.loadMembers();
  }

  loadMembers(): void {
    this.loading.set(true);
    this.apiService.getMembers().subscribe({
      next: (response) => {
        if (response.success) {
          this.members.set(response.data.members);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  onRoleFilterChange(role: 'all' | 'admin' | 'member'): void {
    this.filterRole.set(role);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.filterRole.set('all');
  }

  viewMember(member: Member): void {
    this.router.navigate(['/members', member.memberid]);
  }

  editMember(member: Member, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/members', member.memberid]);
  }

  deleteMember(member: Member, event: Event): void {
    event.stopPropagation();
    if (confirm(`Are you sure you want to delete member "${member.name}"? This action cannot be undone.`)) {
      this.apiService.deleteMember(member.memberid).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.show('Member deleted successfully', 'success');
            this.loadMembers();
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
}
