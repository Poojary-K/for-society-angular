import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { InputComponent } from '../../../shared/components/input/input.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { CreateCauseRequest, Cause } from '../../../core/models/cause.model';
import { compressImages } from '../../../shared/utils/image-compress';

@Component({
  selector: 'app-create-cause',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputComponent, ButtonComponent],
  templateUrl: './create-cause.component.html',
  styleUrl: './create-cause.component.scss',
})
export class CreateCauseComponent implements OnInit {
  private fb = inject(FormBuilder);
  private apiService = inject(ApiService);
  private toastService = inject(ToastService);

  isOpen = signal<boolean>(false);
  loading = signal<boolean>(false);
  createdCauses = signal<Cause[]>([]);
  showSuccess = signal<boolean>(false);
  lastCreatedCause = signal<Cause | null>(null);
  selectedImages = signal<File[]>([]);
  imagesUploading = signal<boolean>(false);

  causeForm: FormGroup;

  canAddAnother = computed(() => this.createdCauses().length > 0);

  constructor() {
    this.causeForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(1)]],
      description: ['', [Validators.maxLength(1000)]],
      amount: [null, [Validators.min(0)]],
      createdat: [this.getTodayDate(), [Validators.required]],
    });
  }

  ngOnInit(): void {
    // Component can be opened programmatically
  }

  open(): void {
    this.isOpen.set(true);
    this.resetForm();
    this.resetImages();
    this.showSuccess.set(false);
  }

  close(): void {
    this.isOpen.set(false);
    this.resetForm();
    this.resetImages();
    this.createdCauses.set([]);
    this.showSuccess.set(false);
    this.lastCreatedCause.set(null);
  }

  resetForm(): void {
    this.causeForm.reset({
      title: '',
      description: '',
      amount: null,
      createdat: this.getTodayDate(),
    });
    this.causeForm.markAsUntouched();
    this.causeForm.markAsPristine();
  }

  resetImages(): void {
    this.selectedImages.set([]);
    this.imagesUploading.set(false);
  }

  async onSubmit(): Promise<void> {
    // Prevent duplicate submissions
    if (this.loading()) {
      return;
    }

    if (this.causeForm.valid) {
      this.loading.set(true);
      const formValue = this.causeForm.value;
      const images = this.selectedImages();

      const causeData: CreateCauseRequest = {
        title: formValue.title.trim(),
        description: formValue.description?.trim() || undefined,
        amount: formValue.amount ? parseFloat(formValue.amount) : undefined,
        createdat: this.toIsoDate(formValue.createdat),
      };

      if (images.length > 0) {
        const formData = new FormData();
        formData.append('title', causeData.title);
        if (causeData.description) {
          formData.append('description', causeData.description);
        }
        if (causeData.amount !== undefined) {
          formData.append('amount', String(causeData.amount));
        }
        if (causeData.createdat) {
          formData.append('createdat', causeData.createdat);
        }
        this.imagesUploading.set(true);
        const compressedImages = await compressImages(images, { quality: 0.5 });
        compressedImages.forEach((file) => formData.append('images', file));

        this.apiService.createCauseWithImages(formData).subscribe({
          next: (response) => {
            if (response.success && response.data) {
              this.handleCauseCreated(response.data);
              this.resetImages();
            }
            this.imagesUploading.set(false);
            this.loading.set(false);
          },
          error: (error) => {
            this.imagesUploading.set(false);
            this.loading.set(false);
            console.error('Error creating cause with images:', error);
          },
        });
      } else {
        this.apiService.createCause(causeData).subscribe({
          next: (response) => {
            if (response.success && response.data) {
              this.handleCauseCreated(response.data);
            }
            this.loading.set(false);
          },
          error: (error) => {
            this.loading.set(false);
            // Error is handled by interceptor, but we can add specific handling here if needed
            console.error('Error creating cause:', error);
          },
        });
      }
    } else {
      this.causeForm.markAllAsTouched();
    }
  }

  private handleCauseCreated(data: any): void {
    const newCause: Cause = {
      causeid: data.causeid,
      title: data.title,
      description: data.description,
      amount: data.amount,
      createdat: data.createdat,
    };

    // Add to created causes list
    this.createdCauses.update((causes) => [newCause, ...causes]);
    this.lastCreatedCause.set(newCause);
    this.showSuccess.set(true);

    this.toastService.success(`Cause "${newCause.title}" created successfully!`);

    // Reset form for next entry
    this.resetForm();
  }

  addAnother(): void {
    this.showSuccess.set(false);
    this.resetForm();
    this.resetImages();
    // Focus on title input after a brief delay
    setTimeout(() => {
      const titleInput = document.querySelector('input[formControlName="title"]') as HTMLInputElement;
      if (titleInput) {
        titleInput.focus();
      }
    }, 100);
  }

  done(): void {
    this.close();
  }

  onImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    if (files.length === 0) return;
    this.selectedImages.update((current) => [...current, ...files]);
    input.value = '';
  }

  clearSelectedImages(input: HTMLInputElement): void {
    this.selectedImages.set([]);
    input.value = '';
  }

  trackByFile(index: number, file: File): string {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }

  get titleError(): string {
    const titleControl = this.causeForm.get('title');
    if (titleControl?.touched && titleControl?.errors) {
      if (titleControl.errors['required']) {
        return 'Title is required';
      }
      if (titleControl.errors['minlength']) {
        return 'Title must be at least 1 character';
      }
    }
    return '';
  }

  get descriptionError(): string {
    const descControl = this.causeForm.get('description');
    if (descControl?.touched && descControl?.errors) {
      if (descControl.errors['maxlength']) {
        return 'Description must be less than 1000 characters';
      }
    }
    return '';
  }

  get amountError(): string {
    const amountControl = this.causeForm.get('amount');
    if (amountControl?.touched && amountControl?.errors) {
      if (amountControl.errors['min']) {
        return 'Amount must be positive';
      }
    }
    return '';
  }

  get createdatError(): string {
    const control = this.causeForm.get('createdat');
    const value = control?.value;
    if (control?.touched && control?.errors) {
      if (control.errors['required']) {
        return 'Date is required';
      }
    }
    if (!value) return '';
    const parts = (value || '').split('-').map((s: string) => parseInt(s, 10));
    if (parts.length !== 3) return 'Invalid date';
    const [y, m, d] = parts;
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getTime() > Date.now()) {
      return 'Date cannot be in the future';
    }
    return '';
  }

  get descriptionLength(): number {
    return this.causeForm.get('description')?.value?.length || 0;
  }

  get maxDescriptionLength(): number {
    return 1000;
  }

  private getTodayDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toIsoDate(value: string | null | undefined): string | undefined {
    if (!value) return undefined;
    const parts = (value || '').split('-').map((s: string) => parseInt(s, 10));
    if (parts.length !== 3) return undefined;
    const [y, m, d] = parts;
    return new Date(Date.UTC(y, m - 1, d)).toISOString();
  }

  trackByCauseId(index: number, cause: Cause): number {
    return cause.causeid;
  }
}
