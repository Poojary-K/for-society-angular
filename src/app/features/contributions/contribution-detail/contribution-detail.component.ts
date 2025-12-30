import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { CardComponent } from '../../../shared/components/card/card.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { EditContributionComponent } from '../edit-contribution/edit-contribution.component';
import { ContributionsService } from '../../../core/services/contributions.service';
import { Contribution, ContributionImage, Member } from '../../../core/models';

@Component({
  selector: 'app-contribution-detail',
  standalone: true,
  imports: [CommonModule, CardComponent, ButtonComponent, EditContributionComponent],
  templateUrl: './contribution-detail.component.html',
  styleUrl: './contribution-detail.component.scss'
})
export class ContributionDetailComponent implements OnInit {
  @ViewChild(EditContributionComponent) editContributionModal?: EditContributionComponent;
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private contributionsService = inject(ContributionsService);

  contribution = signal<Contribution | null>(null);
  member = signal<Member | null>(null);
  members = signal<Member[]>([]);
  loading = signal<boolean>(true);
  loadingMembers = signal<boolean>(false);
  images = signal<ContributionImage[]>([]);
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

  get currentUser() {
    return this.authService.currentUser();
  }

  get canEdit(): boolean {
    const contrib = this.contribution();
    if (!contrib || !this.currentUser) return this.isAdmin;
    return this.isAdmin || contrib.memberid === this.currentUser.memberId;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadContribution(parseInt(id, 10));
    }
  }

  loadContribution(id: number): void {
    this.loading.set(true);
    this.apiService.getContributionById(id).subscribe({
      next: (response) => {
        if (response.success) {
          this.contribution.set(response.data);
          this.loadContributionImages(response.data.contributionid);
          this.loadMembers(response.data.memberid);
          // Load member info if admin
          if (this.isAdmin && response.data.memberid) {
            this.loadMember(response.data.memberid);
          }
        } else {
          this.toastService.show('Failed to load contribution', 'error');
          this.router.navigate(['/contributions']);
        }
        this.loading.set(false);
      },
      error: () => {
        this.toastService.show('Failed to load contribution', 'error');
        this.loading.set(false);
        this.router.navigate(['/contributions']);
      },
    });
  }

  loadContributionImages(contributionId: number): void {
    this.imagesLoading.set(true);
    this.apiService.getContributionImages(contributionId).subscribe({
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

  get activeImage(): ContributionImage | null {
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

  hasImageError(image: ContributionImage): boolean {
    return this.imageLoadFailures().has(image.imageid);
  }

  onViewerImageError(image: ContributionImage, event: Event): void {
    const target = event.target as HTMLImageElement;
    const fallbackUrl = this.getImageFallbackUrl(image.url);
    if (fallbackUrl && !target.dataset['fallbackApplied']) {
      target.dataset['fallbackApplied'] = 'true';
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

  loadMembers(memberId: number): void {
    if (!memberId) {
      this.members.set([]);
      return;
    }

    // Non-admins can only edit their own contribution, so restrict the list
    if (!this.isAdmin) {
      const user = this.currentUser;
      if (user) {
        this.members.set([
          {
            memberid: user.memberId,
            name: user.name,
            email: user.email,
            phone: user.phone,
            password: '',
            joinedon: user.joinedOn,
            is_admin: user.isAdmin,
          },
        ]);
      } else {
        this.members.set([
          {
            memberid: memberId,
            name: `Member #${memberId}`,
            email: null,
            phone: null,
            password: '',
            joinedon: '',
          },
        ]);
      }
      return;
    }

    this.loadingMembers.set(true);
    this.apiService.getMembers().subscribe({
      next: (response) => {
        if (response.success) {
          this.members.set(response.data.members || []);
        }
        this.loadingMembers.set(false);
      },
      error: () => {
        this.loadingMembers.set(false);
      },
    });
  }

  loadMember(id: number): void {
    this.apiService.getMemberById(id).subscribe({
      next: (response) => {
        if (response.success) {
          this.member.set(response.data);
        }
      },
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  formatAmount(amount: string): string {
    const num = parseFloat(amount);
    return `₹${num.toLocaleString('en-IN')}`;
  }

  editContribution(): void {
    if (this.editContributionModal) {
      // Ensure member list is ready before opening
      if (this.members().length === 0 && this.contribution()) {
        this.loadMembers(this.contribution()!.memberid);
      }
      this.editContributionModal.open();
    }
  }

  onContributionUpdated(updatedContribution: Contribution): void {
    this.contribution.set(updatedContribution);
    this.contributionsService.updateContribution(updatedContribution);
    if (this.isAdmin) {
      this.loadMember(updatedContribution.memberid);
    }
  }

  deleteContribution(): void {
    const contribution = this.contribution();
    if (!contribution) return;

    if (confirm(`Are you sure you want to delete this contribution of ${this.formatAmount(contribution.amount)}? This action cannot be undone.`)) {
      this.apiService.deleteContribution(contribution.contributionid).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.show('Contribution deleted successfully', 'success');
            this.router.navigate(['/contributions']);
          } else {
            this.toastService.show('Failed to delete contribution', 'error');
          }
        },
        error: () => {
          this.toastService.show('Failed to delete contribution', 'error');
        },
      });
    }
  }

  onContributionImagesSelected(event: Event): void {
    const contribution = this.contribution();
    if (!contribution) return;

    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    if (files.length === 0) return;

    this.imagesUploading.set(true);
    this.apiService.uploadContributionImages(contribution.contributionid, files).subscribe({
      next: (response) => {
        if (response.success) {
          const newImages = response.data.images || [];
          this.images.update((current) => [...newImages, ...current]);
          this.toastService.show('Contribution images uploaded', 'success');
        } else {
          this.toastService.show('Failed to upload contribution images', 'error');
        }
        this.imagesUploading.set(false);
      },
      error: () => {
        this.toastService.show('Failed to upload contribution images', 'error');
        this.imagesUploading.set(false);
      },
    });

    input.value = '';
  }

  onReplaceContributionImage(image: ContributionImage, event: Event): void {
    const contribution = this.contribution();
    if (!contribution) return;

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.replacingImageId.set(image.imageid);
    this.apiService.replaceContributionImage(contribution.contributionid, image.imageid, file).subscribe({
      next: (response) => {
        if (response.success) {
          const updated = response.data;
          this.images.update((current) =>
            current.map((item) => (item.imageid === updated.imageid ? updated : item))
          );
          this.toastService.show('Contribution image replaced', 'success');
        } else {
          this.toastService.show('Failed to replace contribution image', 'error');
        }
        this.replacingImageId.set(null);
      },
      error: () => {
        this.toastService.show('Failed to replace contribution image', 'error');
        this.replacingImageId.set(null);
      },
    });

    input.value = '';
  }

  deleteContributionImage(image: ContributionImage): void {
    const contribution = this.contribution();
    if (!contribution) return;

    if (!confirm('Delete this image? This action cannot be undone.')) {
      return;
    }

    this.deletingImageId.set(image.imageid);
    this.apiService.deleteContributionImage(contribution.contributionid, image.imageid).subscribe({
      next: (response) => {
        if (response.success) {
          this.images.update((current) => current.filter((item) => item.imageid !== image.imageid));
          this.toastService.show('Contribution image deleted', 'success');
        } else {
          this.toastService.show('Failed to delete contribution image', 'error');
        }
        this.deletingImageId.set(null);
      },
      error: () => {
        this.toastService.show('Failed to delete contribution image', 'error');
        this.deletingImageId.set(null);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/contributions']);
  }
}
