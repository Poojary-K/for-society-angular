import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ContributionsService } from '../../../core/services/contributions.service';
import { Contribution } from '../../../core/models/contribution.model';

@Component({
  selector: 'app-profile-drawer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './profile-drawer.component.html',
  styleUrl: './profile-drawer.component.scss',
})
export class ProfileDrawerComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private contributionsService = inject(ContributionsService);
  private router = inject(Router);
  private subscription = new Subscription();

  isOpen = signal<boolean>(false);
  contributions = signal<Contribution[]>([]);
  loading = signal<boolean>(false);
  private previousRoute: string = '/';
  private routeHistory: string[] = [];

  currentUser = computed(() => this.authService.currentUser());
  isAuthenticated = computed(() => this.authService.isAuthenticated());

  totalContributed = computed(() => {
    const userContributions = this.getUserContributions();
    return userContributions.reduce((total, contrib) => {
      return total + parseFloat(contrib.amount || '0');
    }, 0);
  });

  contributionCount = computed(() => {
    return this.getUserContributions().length;
  });

  ngOnInit(): void {
    // Initialize previous route from current URL if not profile
    const currentUrl = this.router.url;
    if (currentUrl !== '/profile') {
      this.previousRoute = currentUrl;
      this.routeHistory.push(currentUrl);
    } else {
      // If we're already on profile, try to get from history or default to home
      this.previousRoute = this.routeHistory.length > 0 
        ? this.routeHistory[this.routeHistory.length - 1] 
        : '/';
    }

    // Subscribe to contributions from service (only once)
    const contributionsSub = this.contributionsService.contributions$.subscribe((contributions) => {
      this.contributions.set(contributions);
    });
    this.subscription.add(contributionsSub);

    // Subscribe to loading state
    const loadingSub = this.contributionsService.loading$.subscribe((loading) => {
      this.loading.set(loading);
    });
    this.subscription.add(loadingSub);

    // Check if we're on profile route to open drawer
    this.checkRouteAndToggle();

    // Listen to route changes
    const routeSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        if (event instanceof NavigationEnd) {
          const newUrl = event.urlAfterRedirects;
          
          // If navigating to profile, store current route as previous
          if (newUrl === '/profile' && this.routeHistory.length > 0) {
            // Keep the last route before profile
            const lastRoute = this.routeHistory[this.routeHistory.length - 1];
            if (lastRoute !== '/profile') {
              this.previousRoute = lastRoute;
            }
          } else if (newUrl !== '/profile') {
            // Store non-profile routes in history
            if (this.routeHistory.length === 0 || this.routeHistory[this.routeHistory.length - 1] !== newUrl) {
              this.routeHistory.push(newUrl);
              // Keep only last 10 routes
              if (this.routeHistory.length > 10) {
                this.routeHistory.shift();
              }
            }
            this.previousRoute = newUrl;
          }
          
          this.checkRouteAndToggle();
        }
      });
    this.subscription.add(routeSub);
  }

  private checkRouteAndToggle(): void {
    if (this.router.url === '/profile' && this.isAuthenticated()) {
      this.open();
    } else if (this.router.url !== '/profile') {
      // Only close if we're not on profile route
      this.close();
    }
  }

  open(): void {
    if (this.isAuthenticated()) {
      // Store the current route before opening (if not already on profile)
      const currentUrl = this.router.url;
      if (currentUrl !== '/profile' && currentUrl !== this.previousRoute) {
        this.previousRoute = currentUrl;
      }
      this.isOpen.set(true);
      this.loadContributions();
    }
  }

  close(): void {
    this.isOpen.set(false);
    // Navigate back to previous route if we're on profile route
    if (this.router.url === '/profile') {
      // Use a safe route - if previousRoute is empty or same, go to home
      const routeToNavigate = this.previousRoute && 
                              this.previousRoute !== '/profile' && 
                              this.previousRoute !== '' 
        ? this.previousRoute 
        : '/';
      
      // Use setTimeout to ensure drawer closes first, then navigate
      setTimeout(() => {
        this.router.navigate([routeToNavigate]).catch(() => {
          // Fallback to home if navigation fails
          this.router.navigate(['/']);
        });
      }, 100);
    }
  }

  loadContributions(): void {
    if (!this.isAuthenticated()) {
      return;
    }

    // Load contributions (will use cache if available, subscriptions already set up in ngOnInit)
    this.contributionsService.getContributions().subscribe();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  getUserContributions(): Contribution[] {
    const currentUser = this.currentUser();
    if (!currentUser) {
      return [];
    }
    return this.contributions().filter(
      (contrib) => contrib.memberid === currentUser.memberId
    );
  }

  formatCurrency(amount: string | number): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  }

  trackByContributionId(index: number, contribution: Contribution): number {
    return contribution.contributionid;
  }

  logout(): void {
    this.close();
    this.authService.logout();
  }
}

