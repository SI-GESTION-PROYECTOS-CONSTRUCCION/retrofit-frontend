import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
	selector: 'app-sidebar',
	imports: [CommonModule, RouterModule, HasPermissionDirective, ButtonModule],
	templateUrl: './sidebar.html',
	styleUrl: './sidebar.css',
})
export class Sidebar {
	@Input() collapsed = false;

	constructor(
		private authService: AuthService,
		private router: Router,
	) {}

	onLogout(): void {
		this.authService.logout();

		this.router.navigate(['/login']);
	}
}
