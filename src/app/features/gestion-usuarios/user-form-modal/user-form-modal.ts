import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, inject, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RoleResponseDto } from '../../../core/models/role.model';
import { UserCreateDto, UserDto } from '../../../core/models/user.model';
import { RoleService } from '../../../core/services/role.service';
import { ToastService } from '../../../core/services/toast-service';
import { UserService } from '../../../core/services/user.service';
import { SelectModule } from 'primeng/select';

@Component({
	selector: 'app-user-form-modal',
	imports: [CommonModule, ReactiveFormsModule, SelectModule],
	templateUrl: './user-form-modal.html',
	styleUrl: './user-form-modal.css',
})
export class UserFormModalComponent implements OnInit {
	@Output() close = new EventEmitter<void>();
	@Output() saved = new EventEmitter<void>();
	@Input() mode: 'create' | 'edit' | 'view' = 'create';
	@Input() userToEdit: UserDto | null = null;

	private fb = inject(FormBuilder);
	private userService = inject(UserService);
	private roleService = inject(RoleService);
	private toastService = inject(ToastService);

	userForm: FormGroup;
	isSubmitting = false;
	backendErrors: { [key: string]: string } = {};
	roles: RoleResponseDto[] = [];
	readonly roleOverlayOptions = { autoZIndex: true, baseZIndex: 1301 };

	showPassword = false;

	togglePasswordVisibility() {
		this.showPassword = !this.showPassword;
	}

	constructor() {
		this.userForm = this.fb.group({
			name: ['', [Validators.required, Validators.pattern('^[a-zA-ZñÑáéíóúÁÉÍÓÚ ]+$')]],
			lastName: ['', [Validators.required, Validators.pattern('^[a-zA-ZñÑáéíóúÁÉÍÓÚ ]+$')]],
			email: ['', [Validators.required, Validators.email]],
			username: ['', Validators.required],
			role: ['ALMACENERO', Validators.required],
			password: [''],
		});
	}

	ngOnInit(): void {
		this.roleService.getAllRoles().subscribe({
			next: (roles: RoleResponseDto[]) => (this.roles = roles),
			error: (_err: HttpErrorResponse) =>
				this.toastService.show('Error al obtener los roles', 'error'),
		});

		if (this.mode === 'create') {
			this.userForm.reset({ role: 'ALMACENERO' });
			this.userForm
				.get('password')
				?.setValidators([
					Validators.required,
					Validators.minLength(8),
					Validators.pattern('^(?=.*[0-9])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$'),
				]);
		} else if (this.userToEdit) {
			this.userForm.patchValue(this.userToEdit);
			this.userForm.get('password')?.clearValidators();

			if (this.mode === 'view') {
				this.userForm.disable();
			}
		}
		this.userForm.get('password')?.updateValueAndValidity();
	}

	onSubmit() {
		this.backendErrors = {};

		if (this.userForm.invalid) {
			this.userForm.markAllAsTouched();
			return;
		}

		this.isSubmitting = true;
		const rawData = this.userForm.getRawValue();
		const userData = Object.fromEntries(
			Object.entries(rawData).map(([key, value]) => [
				key,
				typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
			]),
		) as unknown as UserCreateDto;

		const request$ =
			this.mode === 'edit' && this.userToEdit
				? this.userService.updateUser(this.userToEdit.id, userData)
				: this.userService.registerUser(userData);

		request$.subscribe({
			next: () => {
				this.isSubmitting = false;
				this.saved.emit();
				this.closeModal();
			},
			error: (err: HttpErrorResponse) => {
				this.isSubmitting = false;
				if (err.status === 400 && err.error) {
					this.backendErrors = err.error; // Guardamos los nuevos errores del back
				} else {
					this.toastService.show('Error no controlado al guardar usuario.', 'error');
				}
			},
		});
	}

	closeModal() {
		this.close.emit();
	}

	hasError(field: string): boolean {
		const control = this.userForm.get(field);
		return (
			!!(control?.invalid && (control.dirty || control.touched)) || !!this.backendErrors[field]
		);
	}
}
