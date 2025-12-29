import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { CardComponent } from '../../../shared/components/card/card.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ScrollAnimationDirective } from '../../../shared/directives/scroll-animation.directive';
import { PieChartComponent } from '../../../shared/components/pie-chart/pie-chart.component';
import { Cause } from '../../../core/models';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, CardComponent, ButtonComponent, ScrollAnimationDirective, PieChartComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private router = inject(Router);

  causes: Cause[] = [];
  fundStatus: any = null;
  loading = true;

  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
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

    this.apiService.getFundStatus().subscribe({
      next: (response) => {
        if (response.success) {
          this.fundStatus = response.data;
        }
      },
    });
  }

  navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  navigateToFeed(): void {
    if (this.isAuthenticated) {
      this.router.navigate(['/feed']);
    } else {
      this.navigateToLogin();
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  parseFloat(value: string): number {
    return parseFloat(value);
  }
}

