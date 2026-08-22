import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { Skeleton } from '../../skeleton/skeleton';
import { Footer } from '../footer/footer';
import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';

@Component({
	selector: 'app-main-layout',
	imports: [CommonModule, RouterModule, Sidebar, Header, Footer, Skeleton],
	templateUrl: './main-layout.html',
	styleUrl: './main-layout.css',
})
export class MainLayout implements OnInit {
	isSidebarOpen = false;
	isSidebarCollapsed = localStorage.getItem('retrofit_sidebar_compact') === 'true';
	private authService = inject(AuthService);
	public isReady = false;

	ngOnInit() {
		this.authService.loadUserProfile().subscribe({
			next: () => {
				this.isReady = true;
			},
			error: () => {
				this.isReady = true;
			},
		});
	}

	toggleSidebar() {
		if (window.matchMedia('(max-width: 768px)').matches) {
			this.isSidebarOpen = !this.isSidebarOpen;
			return;
		}

		this.isSidebarCollapsed = !this.isSidebarCollapsed;
		localStorage.setItem('retrofit_sidebar_compact', String(this.isSidebarCollapsed));
	}
}
