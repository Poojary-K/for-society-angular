import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { CardComponent } from '../../../shared/components/card/card.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { Cause, Contribution } from '../../../core/models';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule, CardComponent, ButtonComponent, BadgeComponent],
  templateUrl: './feed.component.html',
  styleUrl: './feed.component.scss',
})
export class FeedComponent implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  causes: Cause[] = [];
  contributions: Contribution[] = [];
  fundStatus: any = null;
  loading = true;
  showFabMenu = false;

  get currentUser() {
    return this.authService.currentUser();
  }

  get isAdmin() {
    return this.authService.isAdmin();
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    
    this.apiService.getCauses().subscribe({
      next: (response) => {
        if (response.success) {
          this.causes = response.data.causes;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });

    this.apiService.getContributions().subscribe({
      next: (response) => {
        if (response.success) {
          this.contributions = response.data.contributions;
        }
      },
    });

    this.apiService.getFundStatus().subscribe({
      next: (response) => {
        if (response.success) {
          this.fundStatus = response.data;
        }
      },
    });
  }

  toggleFabMenu(): void {
    this.showFabMenu = !this.showFabMenu;
  }

  createCause(): void {
    // TODO: Open create cause modal
    this.toastService.info('Create cause feature coming soon');
    this.showFabMenu = false;
  }

  addContribution(): void {
    // TODO: Open add contribution modal
    this.toastService.info('Add contribution feature coming soon');
    this.showFabMenu = false;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  parseFloat(value: string): number {
    return parseFloat(value);
  }

  getAvatarInitial(): string {
    const name = this.currentUser?.name;
    return name && name.length > 0 ? name.charAt(0).toUpperCase() : 'U';
  }
}

