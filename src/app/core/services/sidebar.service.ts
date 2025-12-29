import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SidebarService {
  private sidebarComponent = signal<{ toggle: () => void } | null>(null);

  registerSidebar(component: { toggle: () => void }): void {
    this.sidebarComponent.set(component);
  }

  unregisterSidebar(): void {
    this.sidebarComponent.set(null);
  }

  toggleSidebar(): void {
    const sidebar = this.sidebarComponent();
    if (sidebar) {
      sidebar.toggle();
    }
  }
}

