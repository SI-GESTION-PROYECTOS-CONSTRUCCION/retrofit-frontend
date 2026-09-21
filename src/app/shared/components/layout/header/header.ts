import { DatePipe } from '@angular/common';
import { Component, EventEmitter, inject, NgZone, OnDestroy, OnInit, Output } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { AuditLog } from '../../../../core/models/auditLog.model';
import { AuditService } from '../../../../core/services/audit.service';
import { AuthService } from '../../../../core/services/auth.service';
import { environment } from '../../../../../environments/environment';

interface HeaderNotification {
	id: string;
	title: string;
	message: string;
	timestamp: string;
	read: boolean;
}

@Component({
	selector: 'app-header',
	imports: [AvatarModule, ButtonModule, DatePipe],
	templateUrl: './header.html',
	styleUrl: './header.css',
})
export class Header implements OnInit, OnDestroy {
	private auditService = inject(AuditService);
	private authService = inject(AuthService);
	private zone = inject(NgZone);
	private streamAbort?: AbortController;
	private notificationsLoadId = 0;
	@Output() toggleMenu = new EventEmitter<void>();
	readonly limaDate = this.getLimaDate();
	notifications: HeaderNotification[] = [];
	isNotificationsOpen = false;
	userName = 'Sesión activa';
	userRole = 'Retrofit';
	userInitials = 'RI';

	onToggleMenu() {
		this.toggleMenu.emit();
	}

	ngOnInit(): void {
		this.loadUserProfile();
		this.loadNotifications();
		this.connectNotificationStream();
	}

	ngOnDestroy(): void {
		this.streamAbort?.abort();
	}

	toggleNotifications(): void {
		this.isNotificationsOpen = !this.isNotificationsOpen;
		if (this.isNotificationsOpen) this.loadNotifications();
	}

	markAllAsRead(): void {
		this.notifications = this.notifications.map((notification) => ({ ...notification, read: true }));
		localStorage.setItem('retrofit_read_notifications', JSON.stringify(this.notifications.map((item) => item.id)));
	}

	get unreadCount(): number {
		return this.notifications.filter((notification) => !notification.read).length;
	}

	private loadNotifications(): void {
		const loadId = ++this.notificationsLoadId;
		const readIds = new Set<string>(JSON.parse(localStorage.getItem('retrofit_read_notifications') ?? '[]'));
		const loaded: HeaderNotification[] = [];
		const loadPage = (pageNumber: number): void => {
			this.auditService.getLogs(pageNumber, 100, '', 'Todos', 'Todas', '').subscribe({
				next: (page) => {
					loaded.push(...page.content.map((log) => this.toNotification(log, readIds)));
					if (page.number + 1 < page.totalPages) {
						loadPage(page.number + 1);
					} else if (loadId === this.notificationsLoadId) {
						this.notifications = loaded;
					}
				},
				error: () => {
					if (loadId === this.notificationsLoadId) this.notifications = [];
				},
			});
		};

		loadPage(0);
	}

	private loadUserProfile(): void {
		this.authService.loadUserProfile().subscribe({
			next: (profile) => {
				this.userName = [profile.name, profile.lastName].filter(Boolean).join(' ') || profile.username;
				this.userRole = profile.role || 'Sin rol asignado';
				this.userInitials = [profile.name, profile.lastName]
					.filter(Boolean)
					.map((name) => name.charAt(0).toUpperCase())
					.join('')
					.slice(0, 2) || profile.username.slice(0, 2).toUpperCase();
			},
			error: () => undefined,
		});
	}

	private toNotification(log: AuditLog, readIds: Set<string>): HeaderNotification {
		const action = { CREATE: 'Nuevo registro', UPDATE: 'Información actualizada', DELETE: 'Registro eliminado', EXPORT: 'Reporte generado' }[log.action] ?? 'Actividad registrada';
		return { id: log.logId, title: action, message: `${log.userName}: ${log.module}`, timestamp: log.timestamp, read: readIds.has(log.logId) };
	}

	private connectNotificationStream(): void {
		const token = this.authService.getToken();
		if (!token) return;

		this.streamAbort = new AbortController();
		void fetch(`${environment.apiUrl}/notifications/stream`, {
			headers: { Authorization: `Bearer ${token}` },
			signal: this.streamAbort.signal,
		}).then(async (response) => {
			if (!response.ok || !response.body) return;
			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';
			while (!this.streamAbort?.signal.aborted) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });
				const events = buffer.split(/\r?\n\r?\n/);
				buffer = events.pop() ?? '';
				events.forEach((event) => this.handleNotificationEvent(event));
			}
		}).catch(() => undefined).finally(() => {
			if (!this.streamAbort?.signal.aborted) {
				window.setTimeout(() => this.connectNotificationStream(), 3_000);
			}
		});
	}

	private handleNotificationEvent(event: string): void {
		const data = event.split(/\r?\n/).find((line) => line.startsWith('data:'))?.slice(5).trim();
		if (!data) return;
		try {
			const notification = JSON.parse(data) as Omit<HeaderNotification, 'read'>;
			this.zone.run(() => {
				if (this.notifications.some((item) => item.id === notification.id)) return;
				this.notifications = [{ ...notification, read: false }, ...this.notifications];
			});
		} catch { /* Ignore malformed SSE messages. */ }
	}

	private getLimaDate(): string {
		const date = new Intl.DateTimeFormat('es-PE', {
			timeZone: 'America/Lima',
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		}).format(new Date());
		return date.charAt(0).toUpperCase() + date.slice(1);
	}
}
