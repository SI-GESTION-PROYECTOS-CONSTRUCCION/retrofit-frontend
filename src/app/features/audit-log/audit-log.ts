import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuditLog } from '../../core/models/auditLog.model';
import { AuditService } from '../../core/services/audit.service';
import { ToastService } from '../../core/services/toast-service';
import { Skeleton } from '../../shared/components/skeleton/skeleton';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';

@Component({
	selector: 'app-audit-log',
	imports: [CommonModule, FormsModule, Skeleton, SelectModule, DatePickerModule],
	templateUrl: './audit-log.html',
	styleUrl: './audit-log.css',
})
export class AuditLogComponent implements OnInit {
	private auditService = inject(AuditService);
	private toastService = inject(ToastService);

	isLoading = true;
	isLoadingStats = true;
	logs: AuditLog[] = [];
	selectedLog: AuditLog | null = null;

	currentPage = 0;
	totalPages = 0;
	totalElements = 0;

	searchTerm: string = '';
	selectedModule: string = 'Todos';
	selectedAction: string = 'Todas';
	selectedDate: string = '';
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
				this.selectedDate,
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

		try {
			if (this.selectedLog.oldData !== 'null') {
				this.selectedLog.oldData = JSON.parse(this.selectedLog.oldData);
			}
			if (this.selectedLog.newData !== 'null') {
				this.selectedLog.newData = JSON.parse(this.selectedLog.newData);
			}
		} catch {
			this.toastService.show('Error interno al leer datos de la auditoría.', 'error');
		}
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
