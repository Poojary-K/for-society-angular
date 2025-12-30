import { Component, OnInit, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { CardComponent } from '../../../shared/components/card/card.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { EditCauseComponent } from '../edit-cause/edit-cause.component';
import { Cause, CauseImage } from '../../../core/models';
import { compressImages } from '../../../shared/utils/image-compress';

@Component({
  selector: 'app-cause-detail',
  standalone: true,
  imports: [CommonModule, CardComponent, ButtonComponent, EditCauseComponent],
  templateUrl: './cause-detail.component.html',
  styleUrl: './cause-detail.component.scss'
})
export class CauseDetailComponent implements OnInit {
  @ViewChild(EditCauseComponent) editCauseModal!: EditCauseComponent;
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  cause = signal<Cause | null>(null);
  loading = signal<boolean>(true);
  showEditForm = signal<boolean>(false);
  images = signal<CauseImage[]>([]);
  imagesLoading = signal<boolean>(false);
  imagesUploading = signal<boolean>(false);
  replacingImageId = signal<number | null>(null);
  deletingImageId = signal<number | null>(null);
  imagesExpanded = signal<boolean>(false);
  imageViewerOpen = signal<boolean>(false);
  activeImageIndex = signal<number>(0);
  imageLoadFailures = signal<Set<number>>(new Set());

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadCause(parseInt(id, 10));
    }
  }

  loadCause(id: number): void {
    this.loading.set(true);
    this.apiService.getCauseById(id).subscribe({
      next: (response) => {
        if (response.success) {
          this.cause.set(response.data);
          this.loadCauseImages(response.data.causeid);
        } else {
          this.toastService.show('Failed to load cause', 'error');
          this.router.navigate(['/causes']);
        }
        this.loading.set(false);
      },
      error: () => {
        this.toastService.show('Failed to load cause', 'error');
        this.loading.set(false);
        this.router.navigate(['/causes']);
      },
    });
  }

  loadCauseImages(causeId: number): void {
    this.imagesLoading.set(true);
    this.apiService.getCauseImages(causeId).subscribe({
      next: (response) => {
        if (response.success) {
          this.images.set(response.data.images || []);
        }
        this.imagesLoading.set(false);
      },
      error: () => {
        this.imagesLoading.set(false);
      },
    });
  }

  toggleImagesExpanded(): void {
    this.imagesExpanded.update((value) => !value);
  }

  openImageViewer(index: number): void {
    const images = this.images();
    if (images.length === 0) return;
    const safeIndex = Math.max(0, Math.min(index, images.length - 1));
    this.activeImageIndex.set(safeIndex);
    this.imageViewerOpen.set(true);
  }

  closeImageViewer(): void {
    this.imageViewerOpen.set(false);
  }

  nextImage(): void {
    const images = this.images();
    if (images.length === 0) return;
    this.activeImageIndex.update((value) => (value + 1) % images.length);
  }

  prevImage(): void {
    const images = this.images();
    if (images.length === 0) return;
    this.activeImageIndex.update((value) => (value - 1 + images.length) % images.length);
  }

  get activeImage(): CauseImage | null {
    const images = this.images();
    const index = this.activeImageIndex();
    return images[index] || null;
  }

  getImageUrl(url: string): string {
    const fileId = this.getDriveFileId(url);
    if (!fileId) return url;
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }

  getImageFallbackUrl(url: string): string | null {
    const fileId = this.getDriveFileId(url);
    if (!fileId) return null;
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
  }

  hasImageError(image: CauseImage): boolean {
    return this.imageLoadFailures().has(image.imageid);
  }

  onViewerImageError(image: CauseImage, event: Event): void {
    const target = event.target as HTMLImageElement;
    const fileId = this.getDriveFileId(image.url);
    const exportUrl = fileId ? this.getImageUrl(image.url) : null;
    const fallbackUrl = fileId ? this.getImageFallbackUrl(image.url) : null;
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
    this.imageLoadFailures.update((current) => {
      const next = new Set(current);
      next.add(image.imageid);
      return next;
    });
  }

  private getDriveFileId(url: string): string | null {
    if (!url || !url.includes('drive.google.com')) return null;
    const idMatch = url.match(/id=([^&]+)/);
    if (idMatch) return idMatch[1];
    const pathMatch = url.match(/\/d\/([^/]+)/);
    if (pathMatch) return pathMatch[1];
    return null;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  formatAmount(amount: string | null): string {
    if (!amount) return 'Not specified';
    const num = parseFloat(amount);
    return `₹${num.toLocaleString('en-IN')}`;
  }

  editCause(): void {
    if (this.editCauseModal && this.cause()) {
      this.editCauseModal.open();
    }
  }

  onCauseUpdated(updatedCause: Cause): void {
    this.cause.set(updatedCause);
  }

  deleteCause(): void {
    // TODO: Implement delete with confirmation dialog
    const cause = this.cause();
    if (!cause) return;

    if (confirm(`Are you sure you want to delete "${cause.title}"? This action cannot be undone.`)) {
      this.apiService.deleteCause(cause.causeid).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.show('Cause deleted successfully', 'success');
            this.router.navigate(['/causes']);
          } else {
            this.toastService.show('Failed to delete cause', 'error');
          }
        },
        error: () => {
          this.toastService.show('Failed to delete cause', 'error');
        },
      });
    }
  }

  async onCauseImagesSelected(event: Event): Promise<void> {
    const cause = this.cause();
    if (!cause) return;

    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    if (files.length === 0) return;

    this.imagesUploading.set(true);
    const compressedImages = await compressImages(files, { quality: 0.5 });
    this.apiService.uploadCauseImages(cause.causeid, compressedImages).subscribe({
      next: (response) => {
        if (response.success) {
          const newImages = response.data.images || [];
          this.images.update((current) => [...newImages, ...current]);
          this.toastService.show('Cause images uploaded', 'success');
        } else {
          this.toastService.show('Failed to upload cause images', 'error');
        }
        this.imagesUploading.set(false);
      },
      error: () => {
        this.toastService.show('Failed to upload cause images', 'error');
        this.imagesUploading.set(false);
      },
    });

    input.value = '';
  }

  async onReplaceCauseImage(image: CauseImage, event: Event): Promise<void> {
    const cause = this.cause();
    if (!cause) return;

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.replacingImageId.set(image.imageid);
    const [compressed] = await compressImages([file], { quality: 0.5 });
    this.apiService.replaceCauseImage(cause.causeid, image.imageid, compressed || file).subscribe({
      next: (response) => {
        if (response.success) {
          const updated = response.data;
          this.images.update((current) =>
            current.map((item) => (item.imageid === updated.imageid ? updated : item))
          );
          this.toastService.show('Cause image replaced', 'success');
        } else {
          this.toastService.show('Failed to replace cause image', 'error');
        }
        this.replacingImageId.set(null);
      },
      error: () => {
        this.toastService.show('Failed to replace cause image', 'error');
        this.replacingImageId.set(null);
      },
    });

    input.value = '';
  }

  deleteCauseImage(image: CauseImage): void {
    const cause = this.cause();
    if (!cause) return;

    if (!confirm('Delete this image? This action cannot be undone.')) {
      return;
    }

    this.deletingImageId.set(image.imageid);
    this.apiService.deleteCauseImage(cause.causeid, image.imageid).subscribe({
      next: (response) => {
        if (response.success) {
          this.images.update((current) => current.filter((item) => item.imageid !== image.imageid));
          this.toastService.show('Cause image deleted', 'success');
        } else {
          this.toastService.show('Failed to delete cause image', 'error');
        }
        this.deletingImageId.set(null);
      },
      error: () => {
        this.toastService.show('Failed to delete cause image', 'error');
        this.deletingImageId.set(null);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/causes']);
  }
}
