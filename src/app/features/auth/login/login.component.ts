import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { InputComponent } from '../../../shared/components/input/input.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputComponent, ButtonComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  loginForm: FormGroup;
  loading = false;
  emailNotVerified = false;
  resendLoading = false;
  resendMessage = '';

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.loading = true;
      this.emailNotVerified = false;
      this.resendMessage = '';
      this.authService.login(this.loginForm.value).subscribe({
        next: (response) => {
          this.loading = false;
          this.toastService.success('Login successful!');
          // Navigate to feed - auth state is already updated in service
          this.router.navigate(['/feed']).catch((err) => {
            console.error('Navigation error:', err);
            // Fallback: reload page
            window.location.href = '/feed';
          });
        },
        error: (error) => {
          this.loading = false;
          if (error?.status === 403 && error?.error?.details?.code === 'EMAIL_NOT_VERIFIED') {
            this.emailNotVerified = true;
            return;
          }
          // Error is handled by interceptor
          console.error('Login error:', error);
        },
      });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }

  navigateToRegister(): void {
    this.router.navigate(['/auth/register']);
  }

  navigateToForgotPassword(): void {
    this.router.navigate(['/auth/forgot-password']);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  resendVerification(): void {
    const email = this.loginForm.get('email')?.value?.trim();
    if (!email) {
      this.toastService.error('Please enter your email to resend verification.');
      return;
    }
    this.resendLoading = true;
    this.authService.resendVerification(email).subscribe({
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
