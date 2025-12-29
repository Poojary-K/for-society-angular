import { Component, OnInit, OnDestroy, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { SidebarService } from '../../../core/services/sidebar.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private authService = inject(AuthService);
  private sidebarService = inject(SidebarService);

  isOpen = signal<boolean>(false);
  currentRoute = signal<string>('');
  isMobile = signal<boolean>(false);

  // Computed signals
  isAuthenticated = computed(() => this.authService.isAuthenticated());
  currentUser = computed(() => this.authService.currentUser());
  isAdmin = computed(() => this.authService.isAdmin());

  navItems: NavItem[] = [
    {
      label: 'Home',
      route: '/',
      icon: 'fa-home',
      requiresAuth: false,
    },
    {
      label: 'Feed',
      route: '/feed',
      icon: 'fa-rss',
      requiresAuth: true,
    },
    {
      label: 'Causes',
      route: '/causes',
      icon: 'fa-heart',
      requiresAuth: false,
    },
    {
      label: 'My Contributions',
      route: '/contributions',
      icon: 'fa-hand-holding-dollar',
      requiresAuth: true,
    },
    {
      label: 'Members',
      route: '/members',
      icon: 'fa-users',
      requiresAuth: true,
    },
  ];

  visibleNavItems = computed(() => {
    return this.navItems.filter((item) => {
      if (item.requiresAuth && !this.isAuthenticated()) {
        return false;
      }
      if (item.requiresAdmin && !this.isAdmin()) {
        return false;
      }
      return true;
    });
  });

  ngOnInit(): void {
    this.checkScreenSize();
    this.setInitialSidebarState();
    this.trackCurrentRoute();
    // Register with sidebar service
    this.sidebarService.registerSidebar({
      toggle: () => this.toggleSidebar(),
    });
  }

  ngOnDestroy(): void {
    this.sidebarService.unregisterSidebar();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkScreenSize();
    this.setInitialSidebarState();
  }

  private checkScreenSize(): void {
    this.isMobile.set(window.innerWidth < 768);
  }

  private setInitialSidebarState(): void {
    // Mobile: closed, Desktop: open
    this.isOpen.set(!this.isMobile());
  }

  private trackCurrentRoute(): void {
    this.currentRoute.set(this.router.url);
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        if (event instanceof NavigationEnd) {
          this.currentRoute.set(event.urlAfterRedirects);
        }
      });
  }

  toggleSidebar(): void {
    this.isOpen.update((value) => !value);
  }

  // Public method to allow external components to toggle
  public openSidebar(): void {
    this.isOpen.set(true);
  }

  public closeSidebarPublic(): void {
    this.isOpen.set(false);
  }

  closeSidebar(): void {
    if (this.isMobile()) {
      this.isOpen.set(false);
    }
  }

  navigateTo(route: string): void {
    this.router.navigate([route]).then(() => {
      this.closeSidebar();
    });
  }

  isActiveRoute(route: string): boolean {
    if (route === '/') {
      return this.currentRoute() === '/';
    }
    return this.currentRoute().startsWith(route);
  }

  openProfileDrawer(): void {
    // This will be handled by the profile drawer component
    // For now, we'll navigate to profile or trigger drawer
    this.router.navigate(['/profile']);
    this.closeSidebar();
  }

  logout(): void {
    this.authService.logout();
    this.closeSidebar();
  }
}

