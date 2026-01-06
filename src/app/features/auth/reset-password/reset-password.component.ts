import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { InputComponent } from '../../../shared/components/input/input.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';

const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  if (!password || !confirmPassword) {
    return null;
  }
  return password === confirmPassword ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputComponent, ButtonComponent],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  resetForm: FormGroup;
  loading = false;
  resetSuccess = false;
  errorMessage = '';
  token = '';

  constructor() {
    this.token = this.route.snapshot.queryParamMap.get('token')?.trim() || '';
    this.resetForm = this.fb.group(
      {
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: passwordMatchValidator }
    );
  }

  onSubmit(): void {
    if (!this.token) {
      this.errorMessage = 'Reset link is missing or invalid.';
      return;
    }

    if (this.resetForm.valid) {
      this.loading = true;
      this.errorMessage = '';
      const newPassword = this.resetForm.get('newPassword')?.value;

      this.authService.resetPassword({ token: this.token, newPassword }).subscribe({
        next: () => {
          this.loading = false;
          this.resetSuccess = true;
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage = error?.error?.message || 'Password reset failed. Please try again.';
          console.error('Reset password error:', error);
        },
      });
    } else {
      this.resetForm.markAllAsTouched();
    }
  }

  navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  navigateToForgot(): void {
    this.router.navigate(['/auth/forgot-password']);
  }

  goBack(): void {
    this.navigateToLogin();
  }
}
