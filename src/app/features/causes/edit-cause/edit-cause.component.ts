import { Component, inject, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { InputComponent } from '../../../shared/components/input/input.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { Cause } from '../../../core/models';

@Component({
  selector: 'app-edit-cause',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputComponent],
  templateUrl: './edit-cause.component.html',
  styleUrl: './edit-cause.component.scss',
})
export class EditCauseComponent {
  private fb = inject(FormBuilder);
  private apiService = inject(ApiService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);

  cause = input.required<Cause>();
  isOpen = signal<boolean>(false);
  loading = signal<boolean>(false);
  causeUpdated = output<Cause>();

  causeForm: FormGroup;
  maxDescriptionLength = 1000;

  constructor() {
    this.causeForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(1)]],
      description: ['', [Validators.maxLength(1000)]],
      amount: [null, [Validators.min(0)]],
      createdat: ['', []],
    });
  }

  open(): void {
    const cause = this.cause();
    this.causeForm.patchValue({
      title: cause.title,
      description: cause.description || '',
      amount: cause.amount ? parseFloat(cause.amount) : null,
      createdat: cause.createdat ? new Date(cause.createdat).toISOString().slice(0, 10) : '',
    });
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
    this.causeForm.reset();
  }

  get descriptionLength(): number {
    return this.causeForm.get('description')?.value?.length || 0;
  }

  get titleError(): string {
    const control = this.causeForm.get('title');
    if (control?.hasError('required') && control?.touched) {
      return 'Title is required';
    }
    if (control?.hasError('minlength') && control?.touched) {
      return 'Title must be at least 1 character';
    }
    return '';
  }

  get descriptionError(): string {
    const control = this.causeForm.get('description');
    if (control?.hasError('maxlength') && control?.touched) {
      return `Description must be less than ${this.maxDescriptionLength} characters`;
    }
    return '';
  }

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  get amountError(): string {
    const control = this.causeForm.get('amount');
    if (control?.hasError('min') && control?.touched) {
      return 'Amount must be greater than or equal to 0';
    }
    return '';
  }

  get createdatError(): string {
    const control = this.causeForm.get('createdat');
    const value = control?.value;
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

  onSubmit(): void {
    if (this.loading()) {
      return;
    }

    if (this.causeForm.valid) {
      this.loading.set(true);
      const formValue = this.causeForm.value;
      const cause = this.cause();

      const causeData = {
        title: formValue.title.trim(),
        description: formValue.description?.trim() || undefined,
        amount: formValue.amount ? parseFloat(formValue.amount) : undefined,
          createdat: (function(){
            if (!formValue.createdat) return undefined;
            const parts = (formValue.createdat || '').split('-').map((s: string) => parseInt(s, 10));
            if (parts.length !== 3) return undefined;
            const [y, m, d] = parts;
            return new Date(Date.UTC(y, m - 1, d)).toISOString();
          })(),
      };

      this.apiService.updateCause(cause.causeid, causeData).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const updatedCause: Cause = {
              causeid: response.data.causeid,
              title: response.data.title,
              description: response.data.description,
              amount: response.data.amount,
              createdat: response.data.createdat,
            };
            this.causeUpdated.emit(updatedCause);
            this.toastService.show(`Cause "${updatedCause.title}" updated successfully!`, 'success');
            this.close();
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
    } else {
      this.causeForm.markAllAsTouched();
    }
  }
}

