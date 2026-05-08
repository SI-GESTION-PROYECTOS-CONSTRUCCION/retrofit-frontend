import { Component, inject, OnInit } from '@angular/core';
import { ProjectService } from '../../../../core/services/project.service';
import { ProjectResponseDto } from '../../../../core/models/project.model';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <--- IMPORTANTE AGREGAR ESTO
import { ProjectCreateModalComponent } from '../../modal/project-create-modal-component/project-create-modal-component';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [RouterModule, CommonModule, ProjectCreateModalComponent, FormsModule], // <--- AGREGADO AQUÍ
  templateUrl: './project-list.html',
  styleUrl: './project-list.css',
})
export class ProjectList implements OnInit {
  private projectService = inject(ProjectService);
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
  
  private searchTimeout: any; 

  ngOnInit(): void {
    this.loadFilterOptions();
    this.loadProjects(this.currentPage);
  }

  loadFilterOptions(): void {
    this.projectService.getStatuses().subscribe({
      next: (data) => {
        this.statuses = data;
      },
      error: (err) => {
        console.error('Error al cargar los Estados desde el backend:', err);
      }
    });

    this.projectService.getPriorities().subscribe({
      next: (data) => {
        this.priorities = data;
      },
      error: (err) => {
        console.error('Error al cargar las Prioridades desde el backend:', err);
      }
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
    this.projectService.getProjects(page, this.pageSize, this.searchTerm, this.selectedPriority, this.selectedStatus)
      .subscribe({
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
    this.onFilterChange(); // Recarga la tabla limpiando filtros desde la pág 0
  }

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