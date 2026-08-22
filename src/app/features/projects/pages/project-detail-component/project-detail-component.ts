import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { ProjectResponseDto } from '../../../../core/models/project.model';
import { ProjectService } from '../../../../core/services/project.service';
import { ToastService } from '../../../../core/services/toast-service';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { ProjectBudgetComponent } from '../project-budget-component/project-budget-component';
import { ProjectGanttComponent } from '../project-gantt-component/project-gantt-component';
import { ProjectInventoryComponent } from '../project-inventory-component/project-inventory-component';
import { ProjectProgressListComponent } from '../project-progress-list-component/project-progress-list-component';
import { ProjectSummaryComponent } from '../project-summary-component/project-summary-component';
import { ProjectSupplyControlComponent } from '../project-supply-control-component/project-supply-control-component';

@Component({
	selector: 'app-project-detail',
	standalone: true,
	imports: [
		CommonModule,
		RouterModule,
		ProjectBudgetComponent,
		ProjectSummaryComponent,
		ProjectProgressListComponent,
		ProjectGanttComponent,
		Skeleton,
		ProjectInventoryComponent,
		ProjectSupplyControlComponent,
	],
	templateUrl: './project-detail-component.html',
	styleUrl: './project-detail-component.css',
})
export class ProjectDetailComponent implements OnInit {
	private route = inject(ActivatedRoute);
	private projectService = inject(ProjectService);
	private toastService = inject(ToastService);

	project: ProjectResponseDto | null = null;
	isLoading = true;
	errorMessage = '';
	activeTab = 'RESUMEN'; // Controla las pestañas

	ngOnInit(): void {
		const queryTab = this.route.snapshot.queryParamMap.get('tab');
		if (queryTab) {
			this.activeTab = queryTab;
		}

		// Buena práctica: Usar switchMap para reaccionar a cambios en la URL de forma segura
		this.route.paramMap
			.pipe(
				switchMap((params) => {
					this.isLoading = true;
					const code = String(params.get('code'));
					return this.projectService.getProjectByCode(code);
				}),
			)
			.subscribe({
				next: (data) => {
					this.project = data;
					this.isLoading = false;
				},
				error: (err: HttpErrorResponse) => {
					this.toastService.showApiError(err, 'Error al cargar detalle');
					this.errorMessage = 'No se pudo cargar la información del proyecto.';
					this.isLoading = false;
				},
			});
	}

	// --- Helpers UI (Reutilizados de tu lista) ---
	getStatusBadgeClass(status: string): string {
		const map: Record<string, string> = {
			EN_EJECUCION: 'badge-executing',
			IN_PROGRESS: 'badge-executing',
			PLANEAMIENTO: 'badge-planning',
			PLANNING: 'badge-planning',
			PAUSADO: 'badge-warning',
			ON_HOLD: 'badge-warning',
			FINALIZADO: 'badge-success',
			COMPLETED: 'badge-success',
		};
		return map[status] || 'badge-planning';
	}

	formatEnum(text: string): string {
		if (!text) return '';
		const translations: Record<string, string> = {
			PLANNING: 'Planeamiento',
			IN_PROGRESS: 'En ejecución',
			ON_HOLD: 'Pausado',
			COMPLETED: 'Completado',
			CANCELLED: 'Cancelado',
			LOW: 'Baja',
			MEDIUM: 'Media',
			HIGH: 'Alta',
			CRITICAL: 'Crítica',
		};
		return (
			translations[text.toUpperCase()] ||
			text
				.replace(/_/g, ' ')
				.toLowerCase()
				.replace(/\b\w/g, (l) => l.toUpperCase())
		);
	}

	getPriorityBadgeClass(priority: string): string {
		const map: Record<string, string> = {
			ALTA: 'badge-danger',
			HIGH: 'badge-danger',
			CRITICA: 'badge-danger',
			CRITICAL: 'badge-danger',
			MEDIA: 'badge-info',
			MEDIUM: 'badge-info',
			BAJA: 'badge-secondary',
			LOW: 'badge-secondary',
		};
		return map[priority] || 'badge-info';
	}

	getInitials(name: string): string {
		if (!name) return 'RP';
		const words = name.trim().split(/\s+/);
		return words.length > 1
			? `${words[0][0]}${words[1][0]}`.toUpperCase()
			: name.slice(0, 2).toUpperCase();
	}

	selectTab(tab: string): void {
		this.activeTab = tab;
	}

	formatDate(dateString: string): string {
		if (!dateString) return 'Sin fecha';
		// Formato simple: Ej. 15 de Mayo, 2024
		const date = new Date(`${dateString}T00:00:00`); // Evita desfase de zona horaria
		return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
	}
}
