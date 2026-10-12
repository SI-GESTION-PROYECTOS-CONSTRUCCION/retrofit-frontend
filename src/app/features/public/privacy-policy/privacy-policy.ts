import { CommonModule } from '@angular/common';
import {
	AfterViewInit,
	ChangeDetectorRef,
	Component,
	HostListener,
	inject,
	OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { ScrollTopModule } from 'primeng/scrolltop';
import { TagModule } from 'primeng/tag';
import { PRIVACY_POLICY_METADATA } from '../../../core/constants/privacy-policy.constants';
import { APP_ROUTES } from '../../../core/constants/routes.constants';
import { AuthService } from '../../../core/services/auth.service';

interface TocSection {
	id: string;
	title: string;
	icon: string;
}

@Component({
	selector: 'app-privacy-policy',
	standalone: true,
	imports: [CommonModule, ButtonModule, TagModule, DividerModule, CardModule, ScrollTopModule],
	templateUrl: './privacy-policy.html',
	styleUrl: './privacy-policy.css',
})
export class PrivacyPolicyComponent implements OnInit, AfterViewInit {
	private readonly cdr = inject(ChangeDetectorRef);
	private readonly router = inject(Router);
	private readonly authService = inject(AuthService);

	readonly lastUpdated = PRIVACY_POLICY_METADATA.LAST_UPDATED;
	readonly version = PRIVACY_POLICY_METADATA.VERSION;

	activeSection = 'sec-1';
	private isProgrammaticScroll = false;
	private scrollTimeout: ReturnType<typeof setTimeout> | null = null;

	readonly sections: TocSection[] = [
		{ id: 'sec-1', title: 'Alcance y Plataforma', icon: 'fa-cubes' },
		{ id: 'sec-2', title: 'Principios de Protección', icon: 'fa-scale-balanced' },
		{ id: 'sec-3', title: 'Datos Personales Tratados', icon: 'fa-id-card' },
		{ id: 'sec-4', title: 'Finalidades del Tratamiento', icon: 'fa-bullseye' },
		{ id: 'sec-5', title: 'Seguridad ISO/IEC 27001', icon: 'fa-shield-halved' },
		{ id: 'sec-6', title: 'Inmutabilidad y Bitácoras', icon: 'fa-database' },
		{ id: 'sec-7', title: 'Conservación y Custodia', icon: 'fa-clock-rotate-left' },
		{ id: 'sec-8', title: 'Derechos del Titular (ARCO)', icon: 'fa-user-check' },
		{ id: 'sec-9', title: 'Consentimiento y Aceptación', icon: 'fa-signature' },
	];

	ngOnInit(): void {
		this.activeSection = 'sec-1';
	}

	ngAfterViewInit(): void {
		setTimeout(() => {
			this.onWindowScroll();
		}, 100);
	}

	@HostListener('window:wheel')
	@HostListener('window:touchmove')
	onUserManualInteraction(): void {
		this.isProgrammaticScroll = false;
	}

	@HostListener('window:scroll')
	onWindowScroll(): void {
		if (this.isProgrammaticScroll) {
			return;
		}

		const scrollHeight = document.documentElement.scrollHeight;
		const scrollTop = window.scrollY || document.documentElement.scrollTop;
		const clientHeight = window.innerHeight || document.documentElement.clientHeight;

		// Si el usuario llega al final de la página, activa la última sección
		if (scrollTop + clientHeight >= scrollHeight - 60) {
			if (this.sections.length > 0) {
				const lastId = this.sections[this.sections.length - 1].id;
				if (this.activeSection !== lastId) {
					this.activeSection = lastId;
					this.cdr.markForCheck();
				}
			}
			return;
		}

		// Umbral de lectura debajo del navbar fijo
		const readingOffset = 160;
		let currentSectionId = this.sections[0].id;

		for (const section of this.sections) {
			const el = document.getElementById(section.id);
			if (el) {
				const rect = el.getBoundingClientRect();
				if (rect.top <= readingOffset) {
					currentSectionId = section.id;
				}
			}
		}

		if (this.activeSection !== currentSectionId) {
			this.activeSection = currentSectionId;
			this.cdr.markForCheck();
		}
	}

	scrollToSection(sectionId: string): void {
		this.activeSection = sectionId;
		this.isProgrammaticScroll = true;

		if (this.scrollTimeout) {
			clearTimeout(this.scrollTimeout);
		}

		const element = document.getElementById(sectionId);
		if (element) {
			const offset = 80;
			const elementPosition = element.getBoundingClientRect().top + window.scrollY;
			const offsetPosition = elementPosition - offset;

			window.scrollTo({
				top: offsetPosition,
				behavior: 'smooth',
			});

			this.scrollTimeout = setTimeout(() => {
				this.isProgrammaticScroll = false;
				this.cdr.markForCheck();
			}, 600);
		} else {
			this.isProgrammaticScroll = false;
		}

		this.cdr.markForCheck();
	}

	printPolicy(): void {
		window.print();
	}

	closeTab(): void {
		// 1. Si la ventana se abrió con script (popup), cerrarla directamente
		if (window.opener) {
			window.close();
			return;
		}

		// 2. Intentar cerrar la pestaña por si el navegador lo permite
		window.close();

		// 3. Si hay historial previo en la misma pestaña
		if (window.history.length > 1) {
			window.history.back();

			// Si el navegador bloqueó window.close() y history.back() no cambió de página
			setTimeout(() => {
				if (window.location.pathname.includes(APP_ROUTES.PRIVACY_POLICY)) {
					this.navigateToFallback();
				}
			}, 250);
		} else {
			// 4. Si se abrió en una nueva pestaña (target="_blank"), redirigir a la vista principal
			this.navigateToFallback();
		}
	}

	private navigateToFallback(): void {
		const target = this.authService.isAutenticated()
			? `/${APP_ROUTES.DASHBOARD}`
			: `/${APP_ROUTES.AUTH.LOGIN}`;
		this.router.navigateByUrl(target);
	}
}
