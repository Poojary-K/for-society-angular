import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { loadingService } from '../../../core/interceptors/loading.interceptor';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading.component.html',
  styleUrl: './loading.component.scss',
})
export class LoadingComponent {
  @Input() fullScreen = false;
  isLoading = loadingService.isLoading;
}

