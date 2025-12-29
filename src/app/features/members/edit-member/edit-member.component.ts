import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { InputComponent } from '../../../shared/components/input/input.component';
import { Member } from '../../../core/models';

@Component({
  selector: 'app-edit-member',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputComponent],
  templateUrl: './edit-member.component.html',
  styleUrl: './edit-member.component.scss',
})
export class EditMemberComponent {
  private fb = inject(FormBuilder);
  private apiService = inject(ApiService);
  private toastService = inject(ToastService);

  member = input.required<Member>();
  canManageAdmin = input<boolean>(false);
  isOpen = signal<boolean>(false);
  loading = signal<boolean>(false);
  memberUpdated = output<Member>();

  memberForm: FormGroup;

  constructor() {
    this.memberForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.email]],
      phone: [''],
      isAdmin: [false],
    });
  }

  open(): void {
    const member = this.member();
    this.memberForm.patchValue({
      name: member.name,
      email: member.email || '',
      phone: member.phone || '',
      isAdmin: !!member.is_admin,
    });
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
    this.memberForm.reset();
  }

  get nameError(): string {
    const control = this.memberForm.get('name');
    if (control?.hasError('required') && control?.touched) {
      return 'Name is required';
    }
    return '';
  }

  get emailError(): string {
    const control = this.memberForm.get('email');
    if (control?.hasError('email') && control?.touched) {
      return 'Please enter a valid email address';
    }
    return '';
  }

  onSubmit(): void {
    if (this.loading()) return;

    if (this.memberForm.valid) {
      this.loading.set(true);
      const formValue = this.memberForm.value;
      const member = this.member();

      const memberData: any = {
        name: formValue.name.trim(),
        email: formValue.email?.trim() || null,
        phone: formValue.phone?.trim() || null,
      };

      if (this.canManageAdmin()) {
        memberData.is_admin = !!formValue.isAdmin;
      }

      this.apiService.updateMember(member.memberid, memberData).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const updatedMember: Member = {
              ...member,
              name: response.data.name ?? member.name,
              email: response.data.email ?? null,
              phone: response.data.phone ?? null,
              password: response.data.password ?? member.password ?? '',
              joinedon: response.data.joinedon ?? member.joinedon,
              is_admin: response.data.is_admin ?? member.is_admin,
            };
            this.memberUpdated.emit(updatedMember);
            this.toastService.show(`Member "${updatedMember.name}" updated successfully!`, 'success');
            this.close();
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
    } else {
      this.memberForm.markAllAsTouched();
    }
  }
}
