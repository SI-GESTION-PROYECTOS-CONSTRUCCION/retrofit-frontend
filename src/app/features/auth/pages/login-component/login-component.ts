import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
	AbstractControl,
	FormBuilder,
	FormGroup,
	ReactiveFormsModule,
	ValidationErrors,
	ValidatorFn,
	Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

export type AuthViewMode = 'LOGIN' | 'FORGOT_PASSWORD' | 'RESET_PASSWORD' | 'REQUIRE_CHANGE';

@Component({
	selector: 'app-login-component',
	imports: [CommonModule, ReactiveFormsModule],
	templateUrl: './login-component.html',
	styleUrl: './login-component.css',
})
export class LoginComponent implements OnInit {
	viewMode: AuthViewMode = 'LOGIN';
	loginForm!: FormGroup;
	changePasswordForm!: FormGroup;
	forgotPasswordForm!: FormGroup;
	resetPasswordForm!: FormGroup;
	
	isLoading = false;
	errorMessage = '';
	successMessage = '';
	resetToken: string | null = null;

	showPassword = false;
	showNewPassword = false;
	showConfirmPassword = false;
	showResetNewPassword = false;
	showResetConfirmPassword = false;

	togglePasswordVisibility(field: 'password' | 'newPassword' | 'confirmPassword' | 'resetNewPassword' | 'resetConfirmPassword') {
		if (field === 'password') this.showPassword = !this.showPassword;
		else if (field === 'newPassword') this.showNewPassword = !this.showNewPassword;
		else if (field === 'confirmPassword') this.showConfirmPassword = !this.showConfirmPassword;
		else if (field === 'resetNewPassword') this.showResetNewPassword = !this.showResetNewPassword;
		else if (field === 'resetConfirmPassword') this.showResetConfirmPassword = !this.showResetConfirmPassword;
	}

	constructor(
		private fb: FormBuilder,
		private authService: AuthService,
		private router: Router,
		private route: ActivatedRoute,
	) {}

	ngOnInit(): void {
		this.loginForm = this.fb.group({
			username: ['', [Validators.required]],
			password: ['', [Validators.required]],
			rememberMe: [false],
		});

		this.changePasswordForm = this.fb.group(
			{
				newPassword: [
					'',
					[
						Validators.required,
						Validators.minLength(8),
						Validators.pattern('^(?=.*[0-9])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$'),
					],
				],
				confirmPassword: ['', [Validators.required]],
			},
			{ validators: this.passwordMatchValidator },
		);

		this.forgotPasswordForm = this.fb.group({
			email: ['', [Validators.required, Validators.email]],
		});

		this.resetPasswordForm = this.fb.group(
			{
				newPassword: [
					'',
					[
						Validators.required,
						Validators.minLength(8),
						Validators.pattern('^(?=.*[0-9])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$'),
					],
				],
				confirmPassword: ['', [Validators.required]],
			},
			{ validators: this.passwordMatchValidator },
		);

		// Detección automática del token para modo RESET_PASSWORD
		this.route.queryParams.subscribe((params) => {
			if (params['token']) {
				this.resetToken = params['token'];
				this.setViewMode('RESET_PASSWORD');
			}
		});

		if (this.authService.isAutenticated()) {
			this.authService.loadUserProfile().subscribe((profile) => {
				if (profile.requirePasswordChange) {
					this.setViewMode('REQUIRE_CHANGE');
				}
			});
		}
	}

	setViewMode(mode: AuthViewMode): void {
		this.errorMessage = '';
		this.successMessage = '';
		this.viewMode = mode;
	}

	private passwordMatchValidator: ValidatorFn = (
		control: AbstractControl,
	): ValidationErrors | null => {
		const newPassword = control.get('newPassword');
		const confirmPassword = control.get('confirmPassword');
		if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
			return { passwordMismatch: true };
		}
		return null;
	};

	onSubmit(): void {
		if (this.loginForm.valid) {
			this.isLoading = true;
			this.errorMessage = '';
			this.successMessage = '';

			const credenciales = {
				username: this.loginForm.value.username,
				password: this.loginForm.value.password,
			};

			this.authService.login(credenciales).subscribe({
				next: (response) => {
					this.isLoading = false;
					if (response?.jwt) {
						this.authService.saveToken(response.jwt);
						if (response.refreshToken) {
							this.authService.saveRefreshToken(response.refreshToken);
						}

						this.router.navigate(['/dashboard']).then((_success) => {
							if (this.router.url === '/login') {
								this.authService.loadUserProfile().subscribe((profile) => {
									if (profile.requirePasswordChange) {
										this.setViewMode('REQUIRE_CHANGE');
									}
								});
							}
						});
					} else {
						this.errorMessage = 'Respuesta inesperada del servidor.';
					}
				},
				error: (errorResponse) => {
					this.isLoading = false;
					if (errorResponse.error?.message) {
						this.errorMessage = errorResponse.error.message;
					} else {
						this.errorMessage = 'Error de conexión con el servidor.';
					}
				},
			});
		} else {
			this.loginForm.markAllAsTouched();
		}
	}

	onForgotPasswordSubmit(): void {
		if (this.forgotPasswordForm.valid) {
			this.isLoading = true;
			this.errorMessage = '';
			this.successMessage = '';
			const email = this.forgotPasswordForm.value.email;

			this.authService.forgotPassword(email).subscribe({
				next: (res) => {
					this.isLoading = false;
					this.successMessage = res.message || 'Si el correo está registrado, recibirás un enlace de recuperación.';
					this.forgotPasswordForm.reset();
				},
				error: (err) => {
					this.isLoading = false;
					this.errorMessage = err.error?.message || err.error?.general || 'Error al procesar la solicitud.';
				},
			});
		} else {
			this.forgotPasswordForm.markAllAsTouched();
		}
	}

	onResetPasswordSubmit(): void {
		if (this.resetPasswordForm.valid && this.resetToken) {
			this.isLoading = true;
			this.errorMessage = '';
			this.successMessage = '';
			const newPassword = this.resetPasswordForm.value.newPassword;

			this.authService.resetPassword(this.resetToken, newPassword).subscribe({
				next: (res) => {
					this.isLoading = false;
					this.successMessage = res.message || 'Contraseña restablecida exitosamente. Ya puedes iniciar sesión.';
					this.resetPasswordForm.reset();
					this.resetToken = null;
					this.router.navigate([], { queryParams: {} });
					this.setViewMode('LOGIN');
				},
				error: (err) => {
					this.isLoading = false;
					this.errorMessage = err.error?.message || err.error?.general || 'El enlace de recuperación es inválido o ha expirado.';
				},
			});
		} else {
			this.resetPasswordForm.markAllAsTouched();
		}
	}

	onChangePasswordSubmit(): void {
		if (this.changePasswordForm.valid) {
			this.isLoading = true;
			this.errorMessage = '';
			const newPassword = this.changePasswordForm.value.newPassword;

			this.authService.changePassword(newPassword).subscribe({
				next: () => {
					this.isLoading = false;
					this.router.navigate(['/dashboard']);
				},
				error: (errorResponse) => {
					this.isLoading = false;
					if (errorResponse.error?.message) {
						this.errorMessage = errorResponse.error.message;
					} else {
						this.errorMessage = 'Error al cambiar la contraseña.';
					}
				},
			});
		} else {
			this.changePasswordForm.markAllAsTouched();
		}
	}
}
