import { Component, OnInit, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { CardComponent } from '../../../shared/components/card/card.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { EditCauseComponent } from '../edit-cause/edit-cause.component';
import { Cause } from '../../../core/models';

@Component({
  selector: 'app-cause-detail',
  standalone: true,
  imports: [CommonModule, CardComponent, ButtonComponent, EditCauseComponent],
  templateUrl: './cause-detail.component.html',
  styleUrl: './cause-detail.component.scss'
})
export class CauseDetailComponent implements OnInit {
  @ViewChild(EditCauseComponent) editCauseModal!: EditCauseComponent;
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  cause = signal<Cause | null>(null);
  loading = signal<boolean>(true);
  showEditForm = signal<boolean>(false);

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadCause(parseInt(id, 10));
    }
  }

  loadCause(id: number): void {
    this.loading.set(true);
    this.apiService.getCauseById(id).subscribe({
      next: (response) => {
        if (response.success) {
          this.cause.set(response.data);
        } else {
          this.toastService.show('Failed to load cause', 'error');
          this.router.navigate(['/causes']);
        }
        this.loading.set(false);
      },
      error: () => {
        this.toastService.show('Failed to load cause', 'error');
        this.loading.set(false);
        this.router.navigate(['/causes']);
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

  formatAmount(amount: string | null): string {
    if (!amount) return 'Not specified';
    const num = parseFloat(amount);
    return `₹${num.toLocaleString('en-IN')}`;
  }

  editCause(): void {
    if (this.editCauseModal && this.cause()) {
      this.editCauseModal.open();
    }
  }

  onCauseUpdated(updatedCause: Cause): void {
    this.cause.set(updatedCause);
  }

  deleteCause(): void {
    // TODO: Implement delete with confirmation dialog
    const cause = this.cause();
    if (!cause) return;

    if (confirm(`Are you sure you want to delete "${cause.title}"? This action cannot be undone.`)) {
      this.apiService.deleteCause(cause.causeid).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.show('Cause deleted successfully', 'success');
            this.router.navigate(['/causes']);
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

  goBack(): void {
    this.router.navigate(['/causes']);
  }
}

