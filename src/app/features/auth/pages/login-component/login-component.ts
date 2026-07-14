import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router'; 
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login-component',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login-component.html',
  styleUrl: './login-component.css',
})
export class LoginComponent implements OnInit { 
  loginForm!: FormGroup;
  changePasswordForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  requirePasswordChange = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
      rememberMe: [false]
    });

    this.changePasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    if (this.authService.isAutenticated()) {
      this.authService.loadUserProfile().subscribe(profile => {
        if (profile.requirePasswordChange) {
          this.requirePasswordChange = true;
        }
      });
    }
  }

  private passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
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

      const credenciales = {
        username: this.loginForm.value.username,
        password: this.loginForm.value.password
      };

      
      this.authService.login(credenciales).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response && response.jwt) {
            this.authService.saveToken(response.jwt);
            if (response.refreshToken) {
              this.authService.saveRefreshToken(response.refreshToken);
            }
            
            this.router.navigate(['/dashboard']).then(success => {
              // Si el guard bloquea la navegación (redirecciona a /login), 
              // debemos cargar el perfil localmente para mostrar el form
              if (this.router.url === '/login') {
                this.authService.loadUserProfile().subscribe(profile => {
                  if (profile.requirePasswordChange) {
                    this.requirePasswordChange = true;
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
          if (errorResponse.error && errorResponse.error.message) {
            this.errorMessage = errorResponse.error.message; 
          } else {
            this.errorMessage = 'Error de conexión con el servidor.';
          }
          console.error('Detalle del error:', errorResponse);
        }
      });
    } else {
      this.loginForm.markAllAsTouched();
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
          if (errorResponse.error && errorResponse.error.message) {
            this.errorMessage = errorResponse.error.message; 
          } else {
            this.errorMessage = 'Error al cambiar la contraseña.';
          }
          console.error('Detalle del error:', errorResponse);
        }
      });
    } else {
      this.changePasswordForm.markAllAsTouched();
    }
  }
}