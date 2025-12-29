// This is a route component that opens the profile drawer
// The actual ProfileDrawerComponent is in shared/components and will handle opening itself
// This component is just a placeholder - the drawer handles the UI
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile-route',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="profile-route-placeholder"></div>`,
  styles: [`
    .profile-route-placeholder {
      min-height: 100vh;
      background: #f9fafb;
    }
  `]
})
export class ProfileDrawerComponent {}

