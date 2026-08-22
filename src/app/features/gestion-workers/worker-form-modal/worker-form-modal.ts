import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, inject, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { WorkerDto, WorkerRequestDto } from '../../../core/models/worker.model';
import { ToastService } from '../../../core/services/toast-service';
import { WorkerService } from '../../../core/services/worker.service';

@Component({
	selector: 'app-worker-form-modal',
	imports: [CommonModule, ReactiveFormsModule, SelectModule],
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
	private toastService = inject(ToastService);

	workerForm: FormGroup;
	isSubmitting = false;
	backendErrors: { [key: string]: string } = {};

	showPassword = false;
	readonly roleOptions = [
		{ label: 'Almacenero', value: 'ALMACENERO' },
		{ label: 'Residente', value: 'INGENIERO_RESIDENTE' },
	];
	readonly roleOverlayOptions = { autoZIndex: true, baseZIndex: 1301 };

	togglePasswordVisibility() {
		this.showPassword = !this.showPassword;
	}

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
			password: [''],
		});
	}

	ngOnInit(): void {
		this.workerForm.get('createAccount')?.valueChanges.subscribe((isChecked) => {
			const userControls = ['username', 'role', 'password', 'email'];
			userControls.forEach((controlName) => {
				const control = this.workerForm.get(controlName);
				if (control) {
					if (isChecked) {
						if (controlName === 'email') {
							control.setValidators([Validators.required, Validators.email]);
						} else if (controlName === 'password') {
							control.setValidators([
								Validators.required,
								Validators.minLength(8),
								Validators.pattern('^(?=.*[0-9])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$'),
							]);
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
		const cleanData = Object.fromEntries(
			Object.entries(rawData).map(([key, value]) => [
				key,
				typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
			]),
		) as unknown as WorkerRequestDto;

		const requestData = {
			position: cleanData.position,
			dni: cleanData.dni,
			phone: cleanData.phone,
			name: cleanData.name,
			lastName: cleanData.lastName,
			username: cleanData.username,
			email: cleanData.email,
			password: cleanData.password,
			role: cleanData.role,
			createAccount: cleanData.createAccount,
		};

		const request$ =
			this.mode === 'edit' && this.workerToEdit
				? this.workerService.updateWorker(this.workerToEdit.id, requestData)
				: this.workerService.createWorker(requestData);

		request$.subscribe({
			next: () => {
				this.isSubmitting = false;
				this.saved.emit();
				this.close.emit();
			},
			error: (err: HttpErrorResponse) => {
				this.isSubmitting = false;

				if (err.status === 400 && err.error) {
					this.backendErrors = err.error;
				} else {
					this.toastService.show('Error no controlado', 'error');
				}
			},
		});
	}

	hasError(field: string): boolean {
		const control = this.workerForm.get(field);
		const isFrontendInvalid = control
			? control.invalid && (control.dirty || control.touched)
			: false;
		const isBackendInvalid = !!this.backendErrors[field];
		return isFrontendInvalid || isBackendInvalid;
	}

	closeModal() {
		this.close.emit();
	}
}
