import { Component, inject, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { InputComponent } from '../../../shared/components/input/input.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { Contribution, Member } from '../../../core/models';

@Component({
  selector: 'app-edit-contribution',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, InputComponent],
  templateUrl: './edit-contribution.component.html',
  styleUrl: './edit-contribution.component.scss',
})
export class EditContributionComponent {
  private fb = inject(FormBuilder);
  private apiService = inject(ApiService);
  private toastService = inject(ToastService);

  contribution = input.required<Contribution>();
  members = input.required<Member[]>();
  isOpen = signal<boolean>(false);
  loading = signal<boolean>(false);
  contributionUpdated = output<Contribution>();
  searchTerm = signal<string>('');

  contributionForm: FormGroup;

  filteredMembers = signal<Member[]>([]);

  constructor() {
    this.contributionForm = this.fb.group({
      memberId: [null, [Validators.required, Validators.min(1)]],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      contributedDate: ['', [Validators.required]],
    });
  }

  open(): void {
    const contrib = this.contribution();
    const contribDate = new Date(contrib.contributeddate).toISOString().split('T')[0];
    this.contributionForm.patchValue({
      memberId: contrib.memberid,
      amount: parseFloat(contrib.amount),
      contributedDate: contribDate,
    });
    this.filteredMembers.set(this.members());
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
    this.contributionForm.reset();
    this.searchTerm.set('');
  }

  onSearchChange(search: string): void {
    this.searchTerm.set(search);
    const searchLower = search.toLowerCase();
    if (!search) {
      this.filteredMembers.set(this.members());
    } else {
      this.filteredMembers.set(
        this.members().filter(
          (m) =>
            m.name.toLowerCase().includes(searchLower) ||
            m.email?.toLowerCase().includes(searchLower) ||
            m.phone?.includes(search)
        )
      );
    }
  }

  onSubmit(): void {
    if (this.loading()) return;

    if (this.contributionForm.valid) {
      this.loading.set(true);
      const formValue = this.contributionForm.value;
      const contrib = this.contribution();

      const contributionData = {
        memberId: formValue.memberId,
        amount: parseFloat(formValue.amount),
        contributedDate: formValue.contributedDate,
      };

      this.apiService.updateContribution(contrib.contributionid, contributionData).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const updated: Contribution = {
              contributionid: response.data.contributionid,
              memberid: response.data.memberid,
              amount: response.data.amount,
              contributeddate: response.data.contributeddate,
              createdat: response.data.createdat,
            };
            this.contributionUpdated.emit(updated);
            this.toastService.show('Contribution updated successfully!', 'success');
            this.close();
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
    } else {
      this.contributionForm.markAllAsTouched();
    }
  }
}

