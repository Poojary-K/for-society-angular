import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { InputComponent } from '../../../shared/components/input/input.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { CreateCauseRequest, Cause } from '../../../core/models/cause.model';

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

  causeForm: FormGroup;

  canAddAnother = computed(() => this.createdCauses().length > 0);

  constructor() {
    this.causeForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(1)]],
      description: ['', [Validators.maxLength(1000)]],
      amount: [null, [Validators.min(0)]],
    });
  }

  ngOnInit(): void {
    // Component can be opened programmatically
  }

  open(): void {
    this.isOpen.set(true);
    this.resetForm();
    this.showSuccess.set(false);
  }

  close(): void {
    this.isOpen.set(false);
    this.resetForm();
    this.createdCauses.set([]);
    this.showSuccess.set(false);
    this.lastCreatedCause.set(null);
  }

  resetForm(): void {
    this.causeForm.reset();
    this.causeForm.markAsUntouched();
    this.causeForm.markAsPristine();
  }

  onSubmit(): void {
    // Prevent duplicate submissions
    if (this.loading()) {
      return;
    }

    if (this.causeForm.valid) {
      this.loading.set(true);
      const formValue = this.causeForm.value;

      const causeData: CreateCauseRequest = {
        title: formValue.title.trim(),
        description: formValue.description?.trim() || undefined,
        amount: formValue.amount ? parseFloat(formValue.amount) : undefined,
      };

      this.apiService.createCause(causeData).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const newCause: Cause = {
              causeid: response.data.causeid,
              title: response.data.title,
              description: response.data.description,
              amount: response.data.amount,
              createdat: response.data.createdat,
            };

            // Add to created causes list
            this.createdCauses.update((causes) => [newCause, ...causes]);
            this.lastCreatedCause.set(newCause);
            this.showSuccess.set(true);

            this.toastService.success(`Cause "${newCause.title}" created successfully!`);

            // Reset form for next entry
            this.resetForm();
          }
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
          // Error is handled by interceptor, but we can add specific handling here if needed
          console.error('Error creating cause:', error);
        },
      });
    } else {
      this.causeForm.markAllAsTouched();
    }
  }

  addAnother(): void {
    this.showSuccess.set(false);
    this.resetForm();
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

  get descriptionLength(): number {
    return this.causeForm.get('description')?.value?.length || 0;
  }

  get maxDescriptionLength(): number {
    return 1000;
  }

  trackByCauseId(index: number, cause: Cause): number {
    return cause.causeid;
  }
}

