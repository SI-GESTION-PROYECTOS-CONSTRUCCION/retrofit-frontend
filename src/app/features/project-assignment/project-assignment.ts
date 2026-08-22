import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';
import { ProjectResponseDto } from '../../core/models/project.model';
import { ProjectAssignmentDto } from '../../core/models/projectAssignment';
import { WorkerDto } from '../../core/models/worker.model';
import { ProjectService } from '../../core/services/project.service';
import { ProjectAssignmentService } from '../../core/services/project-assignment.service';
import { ToastService } from '../../core/services/toast-service';
import { WorkerService } from '../../core/services/worker.service';
import { ConfirmModal } from '../../shared/components/confirm-modal/confirm-modal';
import { Skeleton } from '../../shared/components/skeleton/skeleton';

@Component({
	selector: 'app-project-assignment',
	imports: [CommonModule, Skeleton, HasPermissionDirective, ConfirmModal],
	templateUrl: './project-assignment.html',
	styleUrl: './project-assignment.css',
})
export class ProjectAssignmentComponent implements OnInit {
	private assignmentService = inject(ProjectAssignmentService);
	private workerService = inject(WorkerService);
	private projectService = inject(ProjectService);
	private toastService = inject(ToastService);

	// Data de la BD
	activeProjects: ProjectResponseDto[] = [];
	allWorkers: WorkerDto[] = [];
	availableWorkers: WorkerDto[] = [];
	activeAssignments: ProjectAssignmentDto[] = [];

	isLoading = true;

	// Estados del modal de liberación
	isReleaseModalOpen = false;
	assignmentToReleaseId: number | null = null;
	isReleasing = false;
	workerToReleaseName = '';
	projectNameOfRelease = '';

	ngOnInit(): void {
		this.loadMatrixData();
	}

	loadMatrixData() {
		this.isLoading = true;

		forkJoin({
			projects: this.projectService.getProjects(0, 50, '', undefined, 'ACTIVE'),
			workers: this.workerService.getWorkers(0, 100, ''),
			available: this.workerService.getAvailableWorkers(),
			assignments: this.assignmentService.getActiveAssignments(),
		}).subscribe({
			next: (res) => {
				// Typecast to bypass TS errors since the API might return either Page or Array depending on implementation
				const projectsRes = res.projects as unknown as { content?: unknown };
				const workersRes = res.workers as unknown as { content?: unknown };

				this.activeProjects = (projectsRes.content || projectsRes) as ProjectResponseDto[];
				const workersList: WorkerDto[] = (workersRes.content || workersRes) as WorkerDto[];
				this.allWorkers = workersList.filter((w) => w.active === true);
				this.availableWorkers = res.available;
				this.activeAssignments = res.assignments;

				this.isLoading = false;
			},
			error: (_err: HttpErrorResponse) => {
				this.toastService.show('Error cargando la matriz', 'error');
				this.isLoading = false;
			},
		});
	}

	// --- Lógica de la Matriz ---

	// Verifica si un trabajador está en un proyecto específico
	getAssignmentForCell(workerId: number, projectId: number): ProjectAssignmentDto | undefined {
		return this.activeAssignments.find((a) => a.workerId === workerId && a.projectId === projectId);
	}

	getInitials(name?: string, lastName?: string): string {
		const first = name ? name.charAt(0) : '';
		const last = lastName ? lastName.charAt(0) : '';
		return (first + last).toUpperCase() || '??';
	}

	isWorkerAssignedAnywhere(workerId: number): boolean {
		return this.activeAssignments.some((assignment) => assignment.workerId === workerId);
	}

	// Acción al hacer clic en una celda vacía (+)
	onAssignClick(worker: WorkerDto, project: ProjectResponseDto) {
		const dto: ProjectAssignmentDto = {
			projectId: project.id,
			workerId: worker.id,
			active: true,
		};

		this.assignmentService.assignWorker(dto).subscribe({
			next: () => {
				this.toastService.show('Trabajador asignado exitosamente', 'success');
				this.loadMatrixData();
			},
			error: (_err: HttpErrorResponse) =>
				this.toastService.show('Error asignando trabajador', 'error'),
		});
	}

	// Acción al hacer clic en una celda ocupada (Liberar)
	onReleaseClick(assignmentId: number, workerName: string, projectName: string) {
		this.assignmentToReleaseId = assignmentId;
		this.workerToReleaseName = workerName;
		this.projectNameOfRelease = projectName;
		this.isReleaseModalOpen = true;
	}

	confirmRelease() {
		if (this.assignmentToReleaseId === null) return;
		this.isReleasing = true;
		this.assignmentService.releaseWorker(this.assignmentToReleaseId).subscribe({
			next: () => {
				this.isReleasing = false;
				this.isReleaseModalOpen = false;
				this.assignmentToReleaseId = null;
				this.loadMatrixData();
			},
			error: (_err: HttpErrorResponse) => {
				this.isReleasing = false;
				this.toastService.show('Error liberando trabajador', 'error');
			},
		});
	}

	closeReleaseModal() {
		this.isReleaseModalOpen = false;
		this.assignmentToReleaseId = null;
	}
}
