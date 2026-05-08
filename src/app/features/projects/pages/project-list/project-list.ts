import { Component, inject } from '@angular/core';
import { ProjectService } from '../../../../core/services/project.service';
import { ProjectResponseDto } from '../../../../core/models/project.model';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProjectCreateModalComponent } from '../../modal/project-create-modal-component/project-create-modal-component';

@Component({
  selector: 'app-project-list',
  imports: [RouterModule, CommonModule, ProjectCreateModalComponent],
  templateUrl: './project-list.html',
  styleUrl: './project-list.css',
})
export class ProjectList {
  private projectService = inject(ProjectService);
  isModalOpen = false;
  // Variables de estado
  projects: ProjectResponseDto[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';

  // Variables de Paginación
  totalElements: number = 0;
  totalPages: number = 0;
  currentPage: number = 0;
  pageSize: number = 5; // Mostrando 5 proyectos por defecto

  ngOnInit(): void {
    this.loadProjects(this.currentPage);
  }

  loadProjects(page: number): void {
    this.isLoading = true;
    this.projectService.getProjects(page, this.pageSize).subscribe({
      next: (response) => {
        this.projects = response.content;
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.currentPage = response.number;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Ocurrió un error al cargar el portafolio de proyectos.';
        this.isLoading = false;
        console.error('Error fetching projects:', error);
      }
    });
  }

  // Controles de paginación
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
    this.isModalOpen = true;
  }

  onProjectCreated() {
    
    this.loadProjects(1);
  }

  // --- Funciones UI Helpers (Mapeo de colores) ---
  getStatusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      'EN_EJECUCION': 'badge-success', 'IN_PROGRESS': 'badge-success',
      'PLANEAMIENTO': 'badge-info', 'PLANNING': 'badge-info',
      'PAUSADO': 'badge-warning', 'ON_HOLD': 'badge-warning',
      'FINALIZADO': 'badge-success', 'COMPLETED': 'badge-success'
    };
    return map[status] || 'badge-info';
  }

  getPriorityBadgeClass(priority: string): string {
    const map: Record<string, string> = {
      'ALTA': 'badge-danger', 'HIGH': 'badge-danger',
      'CRITICA': 'badge-danger', 'CRITICAL': 'badge-danger',
      'MEDIA': 'badge-info', 'MEDIUM': 'badge-info',
      'BAJA': 'badge-success', 'LOW': 'badge-success'
    };
    return map[priority] || 'badge-info';
  }

  formatEnum(text: string): string {
    if (!text) return '';
    return text.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    const parts = name.split(' ');
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
  }
}
