import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SidebarService {
  // Stack of registered sidebars; the most recently registered one (e.g. a page-level
  // sidebar like the chat session list) takes over the header hamburger while it's mounted,
  // and the previous one (the global nav sidebar) resumes control once it unregisters.
  private sidebarStack = signal<{ toggle: () => void }[]>([]);

  registerSidebar(component: { toggle: () => void }): void {
    this.sidebarStack.update((stack) => [...stack, component]);
  }

  unregisterSidebar(component: { toggle: () => void }): void {
    this.sidebarStack.update((stack) => stack.filter((c) => c !== component));
  }

  toggleSidebar(): void {
    const stack = this.sidebarStack();
    const active = stack[stack.length - 1];
    if (active) {
      active.toggle();
    }
  }
}

