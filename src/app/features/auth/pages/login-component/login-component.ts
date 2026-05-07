import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
  isLoading = false;
  errorMessage = '';

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
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const credenciales = {
        username: this.loginForm.value.username,
        password: this.loginForm.value.password
      };

      
      this.authService.login(credenciales).subscribe({
        next: (respuesta) => {
          this.isLoading = false;
          if (respuesta && respuesta.token) {
            this.authService.saveToken(respuesta.token);
            
            this.router.navigate(['/dashboard']);
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
}