import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ContributionsService } from '../../../core/services/contributions.service';
import { ToastService } from '../../../core/services/toast.service';
import { InputComponent } from '../../../shared/components/input/input.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { CreateContributionRequest, Contribution } from '../../../core/models/contribution.model';
import { Member } from '../../../core/models/member.model';
import { compressImages } from '../../../shared/utils/image-compress';

@Component({
  selector: 'app-add-contribution',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputComponent, ButtonComponent],
  templateUrl: './add-contribution.component.html',
  styleUrl: './add-contribution.component.scss',
})
export class AddContributionComponent implements OnInit {
  private fb = inject(FormBuilder);
  private apiService = inject(ApiService);
  private contributionsService = inject(ContributionsService);
  private toastService = inject(ToastService);

  isOpen = signal<boolean>(false);
  loading = signal<boolean>(false);
  members = signal<Member[]>([]);
  loadingMembers = signal<boolean>(false);
  createdContributions = signal<Contribution[]>([]);
  showSuccess = signal<boolean>(false);
  lastCreatedContribution = signal<Contribution | null>(null);
  selectedImages = signal<File[]>([]);
  imagesUploading = signal<boolean>(false);

  contributionForm: FormGroup;

  canAddAnother = computed(() => this.createdContributions().length > 0);

  constructor() {
    this.contributionForm = this.fb.group({
      memberId: [null, [Validators.required, Validators.min(1)]],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      contributedDate: [this.getTodayDate(), [Validators.required]],
    });
  }

  ngOnInit(): void {
    // Component can be opened programmatically
  }

  open(): void {
    this.isOpen.set(true);
    this.resetForm();
    this.resetImages();
    this.showSuccess.set(false);
    this.loadMembers();
  }

  close(): void {
    this.isOpen.set(false);
    this.resetForm();
    this.resetImages();
    this.createdContributions.set([]);
    this.showSuccess.set(false);
    this.lastCreatedContribution.set(null);
  }

  resetForm(): void {
    this.contributionForm.reset({
      memberId: null,
      amount: null,
      contributedDate: this.getTodayDate(),
    });
    this.contributionForm.markAsUntouched();
    this.contributionForm.markAsPristine();
  }

  resetImages(): void {
    this.selectedImages.set([]);
    this.imagesUploading.set(false);
  }

  loadMembers(): void {
    this.loadingMembers.set(true);
    this.apiService.getMembers().subscribe({
      next: (response) => {
        if (response.success) {
          this.members.set(response.data.members || []);
        }
        this.loadingMembers.set(false);
      },
      error: () => {
        this.loadingMembers.set(false);
      },
    });
  }

  getTodayDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async onSubmit(): Promise<void> {
    // Prevent duplicate submissions
    if (this.loading()) {
      return;
    }

    if (this.contributionForm.valid) {
      this.loading.set(true);
      const formValue = this.contributionForm.value;
      const images = this.selectedImages();

      const contributionData: CreateContributionRequest = {
        memberId: parseInt(formValue.memberId),
        amount: parseFloat(formValue.amount),
        contributedDate: formValue.contributedDate,
      };

      if (images.length > 0) {
        const formData = new FormData();
        formData.append('memberId', String(contributionData.memberId));
        formData.append('amount', String(contributionData.amount));
        formData.append('contributedDate', contributionData.contributedDate);
        this.imagesUploading.set(true);
        const compressedImages = await compressImages(images, { quality: 0.5 });
        compressedImages.forEach((file) => formData.append('images', file));

        this.apiService.createContributionWithImages(formData).subscribe({
          next: (response) => {
            if (response.success && response.data) {
              this.handleContributionCreated(response.data);
              this.resetImages();
            }
            this.imagesUploading.set(false);
            this.loading.set(false);
          },
          error: (error) => {
            this.imagesUploading.set(false);
            this.loading.set(false);
            console.error('Error creating contribution with images:', error);
          },
        });
      } else {
        this.apiService.createContribution(contributionData).subscribe({
          next: (response) => {
            if (response.success && response.data) {
              this.handleContributionCreated(response.data);
            }
            this.loading.set(false);
          },
          error: (error) => {
            this.loading.set(false);
            console.error('Error creating contribution:', error);
          },
        });
      }
    } else {
      this.contributionForm.markAllAsTouched();
    }
  }

  private handleContributionCreated(data: any): void {
    const newContribution: Contribution = {
      contributionid: data.contributionid,
      memberid: data.memberid,
      amount: data.amount,
      contributeddate: data.contributeddate,
      createdat: data.createdat,
    };

    // Add to created contributions list
    this.createdContributions.update((contributions) => [newContribution, ...contributions]);
    this.lastCreatedContribution.set(newContribution);
    this.showSuccess.set(true);

    // Update the contributions service
    this.contributionsService.addContribution(newContribution);

    const member = this.members().find((m) => m.memberid === newContribution.memberid);
    const memberName = member?.name || `Member #${newContribution.memberid}`;
    this.toastService.success(`Contribution of ₹${newContribution.amount} for ${memberName} added successfully!`);

    // Reset form for next entry
    this.resetForm();
  }

  addAnother(): void {
    this.showSuccess.set(false);
    this.resetForm();
    this.resetImages();
    // Focus on member select after a brief delay
    setTimeout(() => {
      const memberSelect = document.querySelector('select[formControlName="memberId"]') as HTMLSelectElement;
      if (memberSelect) {
        memberSelect.focus();
      }
    }, 100);
  }

  done(): void {
    this.close();
  }

  onImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    if (files.length === 0) return;
    this.selectedImages.update((current) => [...current, ...files]);
    input.value = '';
  }

  clearSelectedImages(input: HTMLInputElement): void {
    this.selectedImages.set([]);
    input.value = '';
  }

  trackByFile(index: number, file: File): string {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }

  getMemberName(memberId: number): string {
    const member = this.members().find((m) => m.memberid === memberId);
    return member ? member.name : `Member #${memberId}`;
  }

  get memberIdError(): string {
    const memberIdControl = this.contributionForm.get('memberId');
    if (memberIdControl?.touched && memberIdControl?.errors) {
      if (memberIdControl.errors['required']) {
        return 'Member is required';
      }
    }
    return '';
  }

  get amountError(): string {
    const amountControl = this.contributionForm.get('amount');
    if (amountControl?.touched && amountControl?.errors) {
      if (amountControl.errors['required']) {
        return 'Amount is required';
      }
      if (amountControl.errors['min']) {
        return 'Amount must be greater than 0';
      }
    }
    return '';
  }

  get dateError(): string {
    const dateControl = this.contributionForm.get('contributedDate');
    if (dateControl?.touched && dateControl?.errors) {
      if (dateControl.errors['required']) {
        return 'Date is required';
      }
    }
    return '';
  }

  trackByContributionId(index: number, contribution: Contribution): number {
    return contribution.contributionid;
  }
}
