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

  constructor() {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.email]],
      phone: [''],
      password: ['', [Validators.required, Validators.minLength(8)]],
      adminSecretCode: [''],
    });
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.loading = true;
      const formValue = { ...this.registerForm.value };
      if (!formValue.adminSecretCode) {
        delete formValue.adminSecretCode;
      }
      if (!formValue.email) {
        delete formValue.email;
      }
      if (!formValue.phone) {
        delete formValue.phone;
      }

      this.authService.register(formValue).subscribe({
        next: (response) => {
          this.loading = false;
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
}

