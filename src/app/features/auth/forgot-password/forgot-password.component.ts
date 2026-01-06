import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { InputComponent } from '../../../shared/components/input/input.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';

const GENERIC_SUCCESS_MESSAGE = 'If the email exists, a password reset link has been sent.';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputComponent, ButtonComponent],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  forgotForm: FormGroup;
  loading = false;
  message = '';

  constructor() {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  onSubmit(): void {
    if (this.forgotForm.valid) {
      this.loading = true;
      this.message = '';
      const email = this.forgotForm.get('email')?.value?.trim();

      this.authService.forgotPassword({ email }).subscribe({
        next: () => {
          this.loading = false;
          this.message = GENERIC_SUCCESS_MESSAGE;
        },
        error: (error) => {
          this.loading = false;
          this.message = GENERIC_SUCCESS_MESSAGE;
          console.error('Forgot password error:', error);
        },
      });
    } else {
      this.forgotForm.markAllAsTouched();
    }
  }

  navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  goBack(): void {
    this.router.navigate(['/auth/login']);
  }
}
