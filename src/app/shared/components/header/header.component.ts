import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SidebarService } from '../../../core/services/sidebar.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  router = inject(Router);
  private authService = inject(AuthService);
  private sidebarService = inject(SidebarService);

  isAuthenticated = computed(() => this.authService.isAuthenticated());
  currentUser = computed(() => this.authService.currentUser());
  isAdmin = computed(() => this.authService.isAdmin());

  toggleSidebar(): void {
    this.sidebarService.toggleSidebar();
  }

  navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  navigateToFeed(): void {
    if (this.isAuthenticated()) {
      this.router.navigate(['/feed']);
    } else {
      this.navigateToLogin();
    }
  }

  getAvatarInitial(): string {
    const name = this.currentUser()?.name;
    return name && name.length > 0 ? name.charAt(0).toUpperCase() : 'U';
  }
}

