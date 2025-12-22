import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  @Input() type: 'primary' | 'secondary' | 'text' | 'fab' = 'primary';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() fullWidth = false;
}

