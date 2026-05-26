import { Component, inject, OnInit } from '@angular/core';
import { WorkerDto } from '../../core/models/worker.model';
import { ProjectResponseDto } from '../../core/models/project.model';
import { ProjectAssignmentDto } from '../../core/models/projectAssignment';
import { ProjectAssignmentService } from '../../core/services/project-assignment.service';
import { WorkerService } from '../../core/services/worker.service';
import { ProjectService } from '../../core/services/project.service';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Skeleton } from '../../shared/components/skeleton/skeleton';

@Component({
  selector: 'app-project-assignment',
  imports: [CommonModule, Skeleton],
  templateUrl: './project-assignment.html',
  styleUrl: './project-assignment.css',
})
export class ProjectAssignmentComponent implements OnInit {
  private assignmentService = inject(ProjectAssignmentService);
  private workerService = inject(WorkerService);
  private projectService = inject(ProjectService);

  // Data de la BD
  activeProjects: ProjectResponseDto[] = [];
  allWorkers: WorkerDto[] = [];
  availableWorkers: WorkerDto[] = [];
  activeAssignments: ProjectAssignmentDto[] = [];

  isLoading = true;

  ngOnInit(): void {
    this.loadMatrixData();
  }

  loadMatrixData() {
    this.isLoading = true;
    
    forkJoin({
      projects: this.projectService.getProjects(0, 50, '', undefined, 'ACTIVE'), 
      workers: this.workerService.getWorkers(0, 100, ''),
      available: this.workerService.getAvailableWorkers(),
      assignments: this.assignmentService.getActiveAssignments()
    }).subscribe({
      next: (res: any) => {
        this.activeProjects = res.projects.content || res.projects;
        this.allWorkers = res.workers.content || res.workers;
        this.availableWorkers = res.available;
        this.activeAssignments = res.assignments;
        
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando la matriz', err);
        this.isLoading = false;
      }
    });
  }

  // --- Lógica de la Matriz ---

  // Verifica si un trabajador está en un proyecto específico
  getAssignmentForCell(workerId: number, projectId: number): ProjectAssignmentDto | undefined {
    return this.activeAssignments.find(a => a.workerId === workerId && a.projectId === projectId);
  }

  getInitials(name?: string, lastName?: string): string {
    const first = name ? name.charAt(0) : '';
    const last = lastName ? lastName.charAt(0) : '';
    return (first + last).toUpperCase() || '??';
  }

  isWorkerAssignedAnywhere(workerId: number): boolean {
    return this.activeAssignments.some(assignment => assignment.workerId === workerId);
  }

  // Acción al hacer clic en una celda vacía (+)
  onAssignClick(worker: WorkerDto, project: ProjectResponseDto) {
    const dto: ProjectAssignmentDto = {
      projectId: project.id,
      workerId: worker.id,
      active: true
    };

    this.assignmentService.assignWorker(dto).subscribe({
      next: () => this.loadMatrixData(), // Recargamos para que se pinte la matriz y actualice la barra derecha
      error: (err) => console.error('Error asignando', err)
    });
  }

  // Acción al hacer clic en una celda ocupada (Liberar)
  onReleaseClick(assignmentId: number) {
    if (confirm('¿Liberar a este trabajador del proyecto?')) {
      this.assignmentService.releaseWorker(assignmentId).subscribe({
        next: () => this.loadMatrixData(),
        error: (err) => console.error('Error liberando', err)
      });
    }
  }
}