import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [],
  templateUrl: './badge.component.html',
  styleUrl: './badge.component.scss',
})
export class BadgeComponent {
  @Input() variant: 'default' | 'success' | 'danger' | 'admin' = 'default';
  @Input() size: 'small' | 'medium' = 'medium';
}

