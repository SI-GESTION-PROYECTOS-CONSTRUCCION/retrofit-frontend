import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuditLog } from '../../core/models/auditLog.model';
import { AuditService } from '../../core/services/audit.service';
import { Skeleton } from '../../shared/components/skeleton/skeleton';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';

interface AuditChange {
	field: string;
	previous?: string;
	current?: string;
}

@Component({
	selector: 'app-audit-log',
	imports: [CommonModule, FormsModule, Skeleton, SelectModule, DatePickerModule],
	templateUrl: './audit-log.html',
	styleUrl: './audit-log.css',
})
export class AuditLogComponent implements OnInit {
	private auditService = inject(AuditService);

	isLoading = true;
	isLoadingStats = true;
	logs: AuditLog[] = [];
	selectedLog: AuditLog | null = null;
	eventSummary = '';
	eventDetails: AuditChange[] = [];

	currentPage = 0;
	totalPages = 0;
	totalElements = 0;

	searchTerm: string = '';
	selectedModule: string = 'Todos';
	selectedAction: string = 'Todas';
	selectedDate: Date | null = null;
	readonly moduleOptions = ['Todos','Trabajadores','Usuarios','Proyectos','Recursos','Roles','Asignaciones','Presupuestos','Gantt','Avances de Obra','Inventario'].map(label => ({ label, value: label }));
	readonly actionOptions = [{label:'Todas las acciones',value:'Todas'},{label:'Crear',value:'CREATE'},{label:'Actualizar',value:'UPDATE'},{label:'Eliminar',value:'DELETE'}];
	private searchDebounce?: ReturnType<typeof setTimeout>;

	stats = {
		todayEvents: 0,
		modifications: 0,
		alerts: 0,
	};

	ngOnInit(): void {
		this.loadStats();
		this.loadLogs();
	}

	loadStats(): void {
		this.isLoadingStats = true;
		this.auditService.getStats().subscribe({
			next: (res) => {
				this.stats = res;
				this.isLoadingStats = false;
			},
			error: () => {
				this.isLoadingStats = false;
			},
		});
	}

	loadLogs(): void {
		this.isLoading = true;
		this.auditService
			.getLogs(
				this.currentPage,
				10,
				this.searchTerm,
				this.selectedModule,
				this.selectedAction,
				this.formatSelectedDate(),
			)
			.subscribe({
				next: (response) => {
					this.logs = response.content;
					this.totalPages = response.totalPages;
					this.totalElements = response.totalElements;
					if (this.logs.length > 0) {
						this.selectLog(this.logs[0]);
					} else {
						this.selectedLog = null;
					}
					this.isLoading = false;
				},
				error: () => {
					this.isLoading = false;
				},
			});
	}

	selectLog(log: AuditLog): void {
		this.selectedLog = { ...log };
		const previous = this.parseAuditData(log.oldData);
		const current = this.parseAuditData(log.newData);
		this.eventSummary = this.getEventSummary(log);
		this.eventDetails = this.getEventDetails(previous, current, log.action);
	}

	nextPage(): void {
		if (this.currentPage < this.totalPages - 1) {
			this.currentPage++;
			this.loadLogs();
		}
	}

	prevPage(): void {
		if (this.currentPage > 0) {
			this.currentPage--;
			this.loadLogs();
		}
	}

	getBadgeClass(action: string): string {
		switch (action?.toUpperCase()) {
			case 'UPDATE':
				return 'badge-update';
			case 'CREATE':
				return 'badge-create';
			case 'DELETE':
				return 'badge-delete';
			case 'LOGIN':
				return 'badge-login';
			default:
				return 'badge-login';
		}
	}

	applyFilters(): void {
		if (this.searchDebounce) clearTimeout(this.searchDebounce);
		this.currentPage = 0;
		this.loadLogs();
	}

	/** El API espera una fecha ISO simple (yyyy-MM-dd), no Date.toString(). */
	private formatSelectedDate(): string {
		if (!this.selectedDate) return '';

		const year = this.selectedDate.getFullYear();
		const month = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
		const day = String(this.selectedDate.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	private parseAuditData(data: string): unknown {
		if (!data || data === 'null') return null;
		try { return JSON.parse(data); } catch { return data; }
	}

	private getEventSummary(log: AuditLog): string {
		const action = {
			CREATE: 'registró nueva información en', UPDATE: 'actualizó información de',
			DELETE: 'eliminó información de', EXPORT: 'generó un reporte de', LOGIN: 'inició sesión en',
		}[log.action?.toUpperCase()] ?? 'realizó una acción en';
		return `${log.userName} ${action} ${log.module}.`;
	}

	private getEventDetails(previous: unknown, current: unknown, action: string): AuditChange[] {
		if (typeof current === 'string' || typeof previous === 'string') {
			return [{ field: 'Detalle', current: this.formatValue(current ?? previous) }];
		}
		const previousData = this.asRecord(previous);
		const currentData = this.asRecord(current);
		return [...new Set([...Object.keys(previousData), ...Object.keys(currentData)])]
			.filter((field) => action.toUpperCase() !== 'UPDATE' || this.formatValue(previousData[field]) !== this.formatValue(currentData[field]))
			.map((field) => ({
				field: this.getFieldLabel(field),
				previous: field in previousData ? this.formatValue(previousData[field]) : undefined,
				current: field in currentData ? this.formatValue(currentData[field]) : undefined,
			}));
	}

	private asRecord(data: unknown): Record<string, unknown> {
		return data && typeof data === 'object' && !Array.isArray(data) ? data as Record<string, unknown> : {};
	}

	private getFieldLabel(field: string): string {
		const labels: Record<string, string> = {
			name: 'Nombre', username: 'Usuario', email: 'Correo electrónico', phone: 'Teléfono', address: 'Dirección',
			dni: 'Documento de identidad', role: 'Rol', status: 'Estado', active: 'Activo', enabled: 'Habilitado',
			description: 'Descripción', quantity: 'Cantidad', unit: 'Unidad', price: 'Precio', cost: 'Costo',
			startDate: 'Fecha de inicio', endDate: 'Fecha de fin', projectName: 'Proyecto', progress: 'Avance', observations: 'Observaciones',
		};
		return labels[field] ?? field.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').replace(/^./, (letter) => letter.toUpperCase());
	}

	private formatValue(value: unknown): string {
		if (value === null || value === undefined || value === '') return 'No especificado';
		if (typeof value === 'boolean') return value ? 'Sí' : 'No';
		if (Array.isArray(value)) return value.length ? value.map((item) => this.formatValue(item)).join(', ') : 'Sin elementos';
		if (typeof value === 'object') return Object.values(value as Record<string, unknown>).map((item) => this.formatValue(item)).join(', ');
		return String(value);
	}

	getConnectionOrigin(ipAddress: string): string {
		if (!ipAddress || ipAddress === 'Desconocida') return 'Origen no identificado';
		if (ipAddress === '127.0.0.1' || ipAddress === '::1' || ipAddress === '0:0:0:0:0:0:0:1') {
			return 'Este mismo equipo (conexión local)';
		}
		return `Red identificada como ${ipAddress}`;
	}

	getDeviceDescription(userAgent: string): string {
		if (!userAgent || userAgent === 'Sistema Interno') return 'Aplicación interna';

		const browser = /Edg\//.test(userAgent) ? 'Microsoft Edge'
			: /OPR\//.test(userAgent) ? 'Opera'
			: /Chrome\//.test(userAgent) ? 'Google Chrome'
			: /Firefox\//.test(userAgent) ? 'Mozilla Firefox'
			: /Safari\//.test(userAgent) ? 'Safari' : 'Navegador no identificado';
		const device = /Windows/.test(userAgent) ? 'Windows'
			: /Mac OS X/.test(userAgent) ? 'macOS'
			: /Android/.test(userAgent) ? 'Android'
			: /iPhone|iPad/.test(userAgent) ? 'iPhone o iPad'
			: /Linux/.test(userAgent) ? 'Linux' : 'dispositivo no identificado';

		return `${browser} en ${device}`;
	}

	onSearchInput(): void {
		if (this.searchDebounce) clearTimeout(this.searchDebounce);
		this.searchDebounce = setTimeout(() => this.applyFilters(), 350);
	}

	// Devuelve true si el registro cumple las condiciones de alerta
	isAlert(log: AuditLog): boolean {
		const isDelete = log.action?.toUpperCase() === 'DELETE';
		const isRoleModule = log.module === 'Roles';
		// Si tienes EXPORT o LOGIN_FAILED en el futuro, los sumas aquí
		return isDelete || isRoleModule;
	}
}
