import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, HostListener, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { ProjectResponseDto } from '../../../../core/models/project.model';
import { ProjectService } from '../../../../core/services/project.service';
import { ToastService } from '../../../../core/services/toast-service';
import { ConfirmModal } from '../../../../shared/components/confirm-modal/confirm-modal';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { ProjectCreateModalComponent } from '../../modal/project-create-modal-component/project-create-modal-component';

@Component({
	selector: 'app-project-list',
	standalone: true,
	imports: [
		RouterModule,
		CommonModule,
		ProjectCreateModalComponent,
		FormsModule,
		ConfirmModal,
		Skeleton,
		HasPermissionDirective,
		ButtonModule,
		InputTextModule,
		SelectModule,
	],
	templateUrl: './project-list.html',
	styleUrl: './project-list.css',
})
export class ProjectList implements OnInit {
	private projectService = inject(ProjectService);
	private toastService = inject(ToastService);
	isModalOpen = false;
	projects: ProjectResponseDto[] = [];
	isLoading: boolean = true;
	errorMessage: string = '';

	totalElements: number = 0;
	totalPages: number = 0;
	currentPage: number = 0;
	pageSize: number = 5;

	searchTerm: string = '';
	selectedPriority: string = '';
	selectedStatus: string = '';

	priorities: string[] = [];
	statuses: string[] = [];
	priorityOptions: { label: string; value: string }[] = [
		{ label: 'Todas las prioridades', value: '' },
	];
	statusOptions: { label: string; value: string }[] = [{ label: 'Todos los estados', value: '' }];
	selectedProject: ProjectResponseDto | null = null;
	activeMenuId: number | null = null;
	menuPosition = { top: '0px', left: '0px' };

	isDeleteModalOpen = false;
	projectToDelete: ProjectResponseDto | null = null;
	isDeleting = false;
	private searchTimeout: ReturnType<typeof setTimeout> | undefined;

	ngOnInit(): void {
		this.loadFilterOptions();
		this.loadProjects(this.currentPage);
	}

	loadFilterOptions(): void {
		this.projectService.getStatuses().subscribe({
			next: (data) => {
				this.statuses = data;
				this.statusOptions = [
					{ label: 'Todos los estados', value: '' },
					...data.map((status) => ({ label: this.formatEnum(status), value: status })),
				];
			},
			error: (err: HttpErrorResponse) => {
				this.toastService.showApiError(err, 'Error al cargar los Estados');
			},
		});

		this.projectService.getPriorities().subscribe({
			next: (data) => {
				this.priorities = data;
				this.priorityOptions = [
					{ label: 'Todas las prioridades', value: '' },
					...data.map((priority) => ({ label: this.formatEnum(priority), value: priority })),
				];
			},
			error: (err: HttpErrorResponse) => {
				this.toastService.showApiError(err, 'Error al cargar las Prioridades');
			},
		});
	}

	onSearchChange(): void {
		if (this.searchTimeout) {
			clearTimeout(this.searchTimeout);
		}
		this.searchTimeout = setTimeout(() => {
			this.onFilterChange();
		}, 500);
	}

	// Se llama cuando cambia el select de Prioridad o Estado
	onFilterChange(): void {
		this.currentPage = 0; // Si filtramos, debemos volver a la primera página
		this.loadProjects(0);
	}

	// Actualizamos para enviar los filtros al servicio
	loadProjects(page: number): void {
		this.isLoading = true;
		this.projectService
			.getProjects(page, this.pageSize, this.searchTerm, this.selectedPriority, this.selectedStatus)
			.subscribe({
				next: (response) => {
					this.projects = response.content;
					this.totalElements = response.totalElements;
					this.totalPages = response.totalPages;
					this.currentPage = response.number;
					this.isLoading = false;
				},
				error: (err: HttpErrorResponse) => {
					this.errorMessage = 'Ocurrió un error al cargar el portafolio de proyectos.';
					this.isLoading = false;
					this.toastService.showApiError(err, 'Error fetching projects');
				},
			});
	}

	nextPage(): void {
		if (this.currentPage < this.totalPages - 1) {
			this.loadProjects(this.currentPage + 1);
		}
	}

	previousPage(): void {
		if (this.currentPage > 0) {
			this.loadProjects(this.currentPage - 1);
		}
	}

	openNewProjectModal() {
		this.selectedProject = null;
		this.isModalOpen = true;
	}

	openEditModal(project: ProjectResponseDto) {
		this.selectedProject = project;
		this.isModalOpen = true;
	}

	openDeleteModal(project: ProjectResponseDto) {
		this.projectToDelete = project;
		this.isDeleteModalOpen = true;
		this.activeMenuId = null;
	}

	confirmDelete() {
		if (!this.projectToDelete) return;

		this.isDeleting = true;
		this.projectService.deleteProject(this.projectToDelete.id).subscribe({
			next: () => {
				this.isDeleting = false;
				this.isDeleteModalOpen = false;
				this.projectToDelete = null;
				this.onFilterChange();
			},
			error: (err: HttpErrorResponse) => {
				this.isDeleting = false;
				this.toastService.showApiError(err, 'Error al eliminar');
			},
		});
	}

	closeDeleteModal() {
		this.isDeleteModalOpen = false;
		this.projectToDelete = null;
	}

	onProjectSaved() {
		this.loadProjects(this.currentPage);
	}

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

	formatEnum(text: string): string {
		if (!text) return '';

		// Diccionario de traducciones para Estados y Prioridades
		const translations: Record<string, string> = {
			// Estados
			PLANNING: 'Planeamiento',
			IN_PROGRESS: 'En Ejecución',
			ON_HOLD: 'Pausado',
			COMPLETED: 'Completado',
			CANCELLED: 'Cancelado',

			// Prioridades
			LOW: 'Baja',
			MEDIUM: 'Media',
			HIGH: 'Alta',
			CRITICAL: 'Crítica',
		};

		return translations[text.toUpperCase()] || text;
	}

	getInitials(name: string): string {
		if (!name) return 'U';
		const parts = name.split(' ');
		return parts.length >= 2
			? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
			: name.substring(0, 2).toUpperCase();
	}

	toggleMenu(projectId: number, event: Event) {
		event.stopPropagation();
		if (this.activeMenuId === projectId) {
			this.activeMenuId = null;
		} else {
			this.activeMenuId = projectId;

			const button = event.currentTarget as HTMLElement;
			if (button) {
				const rect = button.getBoundingClientRect();
				const leftPos = Math.max(8, rect.right - 150);
				this.menuPosition = {
					top: `${rect.bottom + 4}px`,
					left: `${leftPos}px`,
				};
			}
		}
	}

	@HostListener('document:click', ['$event'])
	onDocumentClick(_event: Event) {
		this.activeMenuId = null;
	}
}
