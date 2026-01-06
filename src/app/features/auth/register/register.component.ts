import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { InputComponent } from '../../../shared/components/input/input.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputComponent, ButtonComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  registerForm: FormGroup;
  loading = false;
  showAdminCode = false;
  verificationRequired = false;
  verificationExpiresInSeconds = 0;
  pendingEmail = '';
  resendLoading = false;
  resendMessage = '';

  constructor() {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      adminSecretCode: [''],
    });
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.loading = true;
      this.verificationRequired = false;
      this.resendMessage = '';
      const formValue = { ...this.registerForm.value };
      if (!formValue.adminSecretCode) {
        delete formValue.adminSecretCode;
      }

      this.authService.register(formValue).subscribe({
        next: (response) => {
          this.loading = false;
          if (response?.verificationRequired) {
            this.verificationRequired = true;
            this.pendingEmail = response.email || formValue.email || '';
            this.verificationExpiresInSeconds = response.verificationExpiresInSeconds || 0;
            this.toastService.info('Check your email to verify your account.');
            return;
          }
          if (!response?.token) {
            this.toastService.warning('Registration complete. Please login to continue.');
            this.router.navigate(['/auth/login']);
            return;
          }
          this.toastService.success('Registration successful!');
          // Navigate to feed - auth state is already updated in service
          this.router.navigate(['/feed']).catch((err) => {
            console.error('Navigation error:', err);
            // Fallback: reload page
            window.location.href = '/feed';
          });
        },
        error: (error) => {
          this.loading = false;
          console.error('Registration error:', error);
        },
      });
    } else {
      this.registerForm.markAllAsTouched();
    }
  }

  navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  toggleAdminCode(): void {
    this.showAdminCode = !this.showAdminCode;
  }

  resendVerification(): void {
    if (!this.pendingEmail) {
      this.toastService.error('Please provide an email address to resend verification.');
      return;
    }
    this.resendLoading = true;
    this.authService.resendVerification(this.pendingEmail).subscribe({
      next: (message) => {
        this.resendLoading = false;
        this.resendMessage = message;
        this.toastService.success(message);
      },
      error: (error) => {
        this.resendLoading = false;
        console.error('Resend verification error:', error);
      },
    });
  }
}
