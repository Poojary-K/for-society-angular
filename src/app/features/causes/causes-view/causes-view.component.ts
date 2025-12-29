import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { CardComponent } from '../../../shared/components/card/card.component';
import { Cause } from '../../../core/models';

@Component({
  selector: 'app-causes-view',
  standalone: true,
  imports: [CommonModule, CardComponent],
  templateUrl: './causes-view.component.html',
  styleUrl: './causes-view.component.scss'
})
export class CausesViewComponent implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  causes = signal<Cause[]>([]);
  loading = signal<boolean>(true);
  searchQuery = signal<string>('');

  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  get filteredCauses(): Cause[] {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) {
      return this.causes();
    }
    return this.causes().filter(cause =>
      cause.title.toLowerCase().includes(query) ||
      (cause.description && cause.description.toLowerCase().includes(query))
    );
  }

  ngOnInit(): void {
    this.loadCauses();
  }

  loadCauses(): void {
    this.loading.set(true);
    this.apiService.getCauses().subscribe({
      next: (response) => {
        if (response.success) {
          this.causes.set(response.data.causes);
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

  formatAmount(amount: string | null): string {
    if (!amount) return 'Not specified';
    const num = parseFloat(amount);
    return `₹${num.toLocaleString('en-IN')}`;
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
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
            this.loadCauses();
          } else {
            this.toastService.show('Failed to delete cause', 'error');
          }
        },
        error: () => {
          this.toastService.show('Failed to delete cause', 'error');
        },
      });
    }
  }
}
