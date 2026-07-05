import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { WorkerDto } from '../../../core/models/worker.model';
import { WorkerService } from '../../../core/services/worker.service';

@Component({
  selector: 'app-worker-form-modal',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './worker-form-modal.html',
  styleUrl: './worker-form-modal.css',
})
export class WorkerFormModalComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();
  @Input() mode: 'create' | 'edit' | 'view' = 'create';
  @Input() workerToEdit: WorkerDto | null = null;

  private fb = inject(FormBuilder);
  private workerService = inject(WorkerService);

  workerForm: FormGroup;
  isSubmitting = false;
  backendErrors: { [key: string]: string } = {};

  constructor() {
    this.workerForm = this.fb.group({
      name: ['', [Validators.required, Validators.pattern('^[a-zA-ZñÑáéíóúÁÉÍÓÚ ]+$')]],
      lastName: ['', [Validators.required, Validators.pattern('^[a-zA-ZñÑáéíóúÁÉÍÓÚ ]+$')]],
      dni: ['', Validators.required],
      position: ['', Validators.required],
      phone: ['', Validators.required],
      createAccount: [false],
      email: [''], 
      username: [''],
      role: [null],
      password: ['']
    });
  }

  ngOnInit(): void {
    this.workerForm.get('createAccount')?.valueChanges.subscribe(isChecked => {
      const userControls = ['username', 'role', 'password', 'email'];
      userControls.forEach(controlName => {
        const control = this.workerForm.get(controlName);
        if (control) {
          if (isChecked) {
            if (controlName === 'email') {
              control.setValidators([Validators.required, Validators.email]);
            } else {
              control.setValidators([Validators.required]);
            }
          } else {
            control.clearValidators();
            control.setValue(null);
          }
          control.updateValueAndValidity();
        }
      });
    });

      if (this.mode !== 'create' && this.workerToEdit) {
        this.workerForm.patchValue(this.workerToEdit);
        if (this.mode === 'view') {
          this.workerForm.disable();
        }
      }
    }

  onSubmit() {
    this.backendErrors = {};

    if (this.workerForm.invalid) {
      this.workerForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const rawData = this.workerForm.getRawValue();

    const requestData = {
      position: rawData.position,
      dni: rawData.dni,
      phone: rawData.phone,
      name: rawData.name,
      lastName: rawData.lastName,
      username: rawData.username,
      email: rawData.email,
      password: rawData.password,
      role: rawData.role,
      createAccount: rawData.createAccount
    };

    const request$ = (this.mode === 'edit' && this.workerToEdit)
    ? this.workerService.updateWorker(this.workerToEdit.id, requestData)
    : this.workerService.createWorker(requestData);

    request$.subscribe({
      next: () => {
        this.isSubmitting = false;
        this.saved.emit();
        this.close.emit();
      },
      error: (err) => {
        this.isSubmitting = false;
        
        if (err.status === 400 && err.error) {
          this.backendErrors = err.error;
        } else {
          console.error('Error no controlado', err);
        }
      }
    });
  }

  hasError(field: string): boolean {
  const control = this.workerForm.get(field);
  const isFrontendInvalid = control ? control.invalid && (control.dirty || control.touched) : false;
  const isBackendInvalid = !!this.backendErrors[field];
  return isFrontendInvalid || isBackendInvalid;
}

  closeModal() { this.close.emit(); }
}
