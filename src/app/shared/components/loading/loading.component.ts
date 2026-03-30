import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { loadingService } from '../../../core/interceptors/loading.interceptor';
import { APP_LOGO_BACKGROUND_IMAGE } from '../../../core/constants/branding.constants';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading.component.html',
  styleUrl: './loading.component.scss',
})
export class LoadingComponent {
  @Input() fullScreen = false;
  readonly appLogoBackground = APP_LOGO_BACKGROUND_IMAGE;
  isLoading = loadingService.isLoading;
}

