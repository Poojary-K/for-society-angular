import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { CardComponent } from '../../../shared/components/card/card.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ScrollAnimationDirective } from '../../../shared/directives/scroll-animation.directive';
import { PieChartComponent } from '../../../shared/components/pie-chart/pie-chart.component';
import { Cause, CauseImage, Contribution } from '../../../core/models';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, CardComponent, ButtonComponent, ScrollAnimationDirective, PieChartComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private router = inject(Router);

  causes: Cause[] = [];
  causeImages = new Map<number, CauseImage[]>();
  private failedCauseImages = new Set<number>();
  private failedViewerImages = new Set<string>();
  causeViewerOpen = false;
  activeCauseId: number | null = null;
  activeImageIndex = 0;
  fundStatus: any = null;
  loading = true;
  currentCycleTotal: number | null = null;
  currentCycleLabel = '';
  private readonly donationCycleStartDay = this.normalizeStartDay(environment.donationCycleStartDay);

  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.apiService.getCauses().subscribe({
      next: (response) => {
        if (response.success) {
          this.causes = response.data.causes;
          this.causeImages.clear();
          this.failedCauseImages.clear();
          this.failedViewerImages.clear();
          this.loadCauseImages(this.causes);
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });

    this.apiService.getFundStatus().subscribe({
      next: (response) => {
        if (response.success) {
          this.fundStatus = response.data;
        }
      },
    });

    this.apiService.getContributions().subscribe({
      next: (response) => {
        if (response.success) {
          const contributions = (response.data?.contributions || []) as Contribution[];
          this.setCurrentCycleSummary(contributions);
        }
      },
      error: () => {
        this.currentCycleTotal = null;
        this.currentCycleLabel = '';
      },
    });
  }

  navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  navigateToFeed(): void {
    if (this.isAuthenticated) {
      this.router.navigate(['/feed']);
    } else {
      this.navigateToLogin();
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  getCauseImageUrl(causeId: number): string | null {
    const images = this.causeImages.get(causeId) || [];
    return images[0]?.url || null;
  }

  isCauseImageFailed(causeId: number): boolean {
    return this.failedCauseImages.has(causeId);
  }

  onCauseImageError(causeId: number, event: Event): void {
    const target = event.target as HTMLImageElement;
    const sourceUrl = this.getCauseImageUrl(causeId) || '';
    const fileId = this.getDriveFileId(sourceUrl);
    const exportUrl = fileId ? this.getImageUrl(sourceUrl) : null;
    const fallbackUrl = fileId ? this.getImageFallbackUrl(sourceUrl) : null;
    const stage = target.dataset['fallbackStage'] || '';

    if (exportUrl && stage !== 'export' && target.src !== exportUrl) {
      target.dataset['fallbackStage'] = 'export';
      target.src = exportUrl;
      return;
    }

    if (fallbackUrl && stage !== 'thumb' && target.src !== fallbackUrl) {
      target.dataset['fallbackStage'] = 'thumb';
      target.src = fallbackUrl;
      return;
    }
    this.failedCauseImages.add(causeId);
  }

  openCauseViewer(causeId: number, index: number = 0): void {
    const images = this.causeImages.get(causeId) || [];
    if (images.length === 0) return;
    const safeIndex = Math.max(0, Math.min(index, images.length - 1));
    this.activeCauseId = causeId;
    this.activeImageIndex = safeIndex;
    this.causeViewerOpen = true;
  }

  closeCauseViewer(): void {
    this.causeViewerOpen = false;
  }

  nextCauseImage(): void {
    const images = this.getActiveCauseImages();
    if (images.length === 0) return;
    this.activeImageIndex = (this.activeImageIndex + 1) % images.length;
  }

  prevCauseImage(): void {
    const images = this.getActiveCauseImages();
    if (images.length === 0) return;
    this.activeImageIndex = (this.activeImageIndex - 1 + images.length) % images.length;
  }

  get activeCauseImage(): CauseImage | null {
    const images = this.getActiveCauseImages();
    return images[this.activeImageIndex] || null;
  }

  hasViewerImageError(image: CauseImage): boolean {
    return this.failedViewerImages.has(this.getViewerKey(image));
  }

  onViewerImageError(image: CauseImage, event: Event): void {
    const target = event.target as HTMLImageElement;
    const sourceUrl = image.url;
    const fileId = this.getDriveFileId(sourceUrl);
    const exportUrl = fileId ? this.getImageUrl(sourceUrl) : null;
    const fallbackUrl = fileId ? this.getImageFallbackUrl(sourceUrl) : null;
    const stage = target.dataset['fallbackStage'] || '';

    if (exportUrl && stage !== 'export' && target.src !== exportUrl) {
      target.dataset['fallbackStage'] = 'export';
      target.src = exportUrl;
      return;
    }

    if (fallbackUrl && stage !== 'thumb' && target.src !== fallbackUrl) {
      target.dataset['fallbackStage'] = 'thumb';
      target.src = fallbackUrl;
      return;
    }

    this.failedViewerImages.add(this.getViewerKey(image));
  }

  parseFloat(value: string): number {
    return parseFloat(value);
  }

  private setCurrentCycleSummary(contributions: Contribution[]): void {
    const { start, end } = this.getCycleRange(new Date(), this.donationCycleStartDay);
    this.currentCycleLabel = `${this.formatCycleDate(start)} - ${this.formatCycleDate(end)}`;
    this.currentCycleTotal = contributions
      .filter((contribution) => {
        const contribDate = this.parseDateInput(contribution.contributeddate);
        return contribDate ? this.isWithinRange(contribDate, start, end) : false;
      })
      .reduce((sum, contribution) => sum + parseFloat(contribution.amount), 0);
  }

  private loadCauseImages(causes: Cause[]): void {
    causes.forEach((cause) => {
      this.apiService.getCauseImages(cause.causeid).subscribe({
        next: (response) => {
          if (response.success) {
            const images = (response.data.images || []) as CauseImage[];
            this.causeImages.set(cause.causeid, images);
          }
        },
      });
    });
  }

  getActiveCauseImages(): CauseImage[] {
    if (this.activeCauseId === null) return [];
    return this.causeImages.get(this.activeCauseId) || [];
  }

  private getViewerKey(image: CauseImage): string {
    return `${image.causeid}:${image.imageid}`;
  }

  private getImageUrl(url: string): string {
    const fileId = this.getDriveFileId(url);
    if (!fileId) return url;
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }

  private getImageFallbackUrl(url: string): string | null {
    const fileId = this.getDriveFileId(url);
    if (!fileId) return null;
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;
  }

  private getDriveFileId(url: string): string | null {
    if (!url || !url.includes('drive.google.com')) return null;
    const idMatch = url.match(/id=([^&]+)/);
    if (idMatch) return idMatch[1];
    const pathMatch = url.match(/\/d\/([^/]+)/);
    if (pathMatch) return pathMatch[1];
    return null;
  }

  private parseDateInput(value: string): Date | null {
    if (!value) {
      return null;
    }
    const datePart = value.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) {
      return null;
    }
    return new Date(year, month - 1, day);
  }

  private normalizeStartDay(value: number | undefined): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return 1;
    }
    return Math.min(Math.max(Math.floor(value), 1), 31);
  }

  private getCycleRange(baseDate: Date, startDay: number): { start: Date; end: Date } {
    const currentMonthStart = this.getSafeDate(baseDate.getFullYear(), baseDate.getMonth(), startDay);
    const start = baseDate >= currentMonthStart
      ? currentMonthStart
      : this.getSafeDate(baseDate.getFullYear(), baseDate.getMonth() - 1, startDay);
    const end = this.getSafeDate(start.getFullYear(), start.getMonth() + 1, startDay);
    return { start, end };
  }

  private getSafeDate(year: number, monthIndex: number, day: number): Date {
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const clampedDay = Math.min(day, daysInMonth);
    return new Date(year, monthIndex, clampedDay);
  }

  private isWithinRange(date: Date, start: Date, end: Date): boolean {
    const time = date.getTime();
    return time >= start.getTime() && time < end.getTime();
  }

  private formatCycleDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
}
