import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { InputComponent } from '../../../shared/components/input/input.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';

type VerifyStatus = 'loading' | 'success' | 'error' | 'invalid';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputComponent, ButtonComponent],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.scss',
})
export class VerifyEmailComponent implements OnInit {
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  status: VerifyStatus = 'loading';
  message = '';
  verifiedEmail = '';
  isExpired = false;
  resendForm: FormGroup;
  resendLoading = false;
  resendMessage = '';

  constructor() {
    this.resendForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.status = 'invalid';
      this.message = 'Missing verification token.';
      return;
    }

    this.authService.verifyEmail(token).subscribe({
      next: (response) => {
        this.status = 'success';
        this.verifiedEmail = response.email;
        this.message = 'Email verified successfully.';
        if (response.email) {
          this.resendForm.patchValue({ email: response.email });
        }
      },
      error: (error) => {
        const errorMessage = error?.error?.message || 'Verification failed. Please request a new link.';
        this.status = 'error';
        this.message = errorMessage;
        this.isExpired = errorMessage.toLowerCase().includes('expired');
      },
    });
  }

  resendVerification(): void {
    if (this.resendForm.invalid) {
      this.resendForm.markAllAsTouched();
      return;
    }

    const email = this.resendForm.get('email')?.value?.trim();
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

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
