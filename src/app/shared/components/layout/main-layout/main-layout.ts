import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { StorageKeys } from '../../../../core/constants/storage.constants';
import { AuthService } from '../../../../core/services/auth.service';
import { ResponsiveService } from '../../../../core/services/responsive.service';
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
	isSidebarCollapsed = localStorage.getItem(StorageKeys.SIDEBAR_COMPACT) === 'true';
	private authService = inject(AuthService);
	private responsiveService = inject(ResponsiveService);
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
		if (this.responsiveService.isMobile) {
			this.isSidebarOpen = !this.isSidebarOpen;
			return;
		}

		this.isSidebarCollapsed = !this.isSidebarCollapsed;
		localStorage.setItem(StorageKeys.SIDEBAR_COMPACT, String(this.isSidebarCollapsed));
	}
}
