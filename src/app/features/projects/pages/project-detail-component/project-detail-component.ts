import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ProjectService } from '../../../../core/services/project.service';
import { ProjectResponseDto } from '../../../../core/models/project.model';
import { switchMap } from 'rxjs/operators';
import { ProjectBudgetComponent } from '../project-budget-component/project-budget-component';
import { ProjectSummaryComponent } from '../project-summary-component/project-summary-component';
import { ProjectProgressListComponent } from '../project-progress-list-component/project-progress-list-component';
import { ProjectGanttComponent } from '../project-gantt-component/project-gantt-component';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ProjectBudgetComponent, ProjectSummaryComponent, ProjectProgressListComponent, ProjectGanttComponent],
  templateUrl: './project-detail-component.html',
  styleUrl: './project-detail-component.css'
})
export class ProjectDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private projectService = inject(ProjectService);

  project: ProjectResponseDto | null = null;
  isLoading = true;
  errorMessage = '';
  activeTab = 'RESUMEN'; // Controla las pestañas

  ngOnInit(): void {
    // Buena práctica: Usar switchMap para reaccionar a cambios en la URL de forma segura
    this.route.paramMap.pipe(
      switchMap(params => {
        this.isLoading = true;
        const code = String(params.get('code'));
        return this.projectService.getProjectByCode(code);
      })
    ).subscribe({
      next: (data) => {
        this.project = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error al cargar detalle:', err);
        this.errorMessage = 'No se pudo cargar la información del proyecto.';
        this.isLoading = false;
      }
    });
  }

  // --- Helpers UI (Reutilizados de tu lista) ---
  getStatusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      'EN_EJECUCION': 'badge-executing', 'IN_PROGRESS': 'badge-executing',
      'PLANEAMIENTO': 'badge-planning', 'PLANNING': 'badge-planning',
      'PAUSADO': 'badge-warning', 'ON_HOLD': 'badge-warning',
      'FINALIZADO': 'badge-success', 'COMPLETED': 'badge-success'
    };
    return map[status] || 'badge-planning';
  }

  formatEnum(text: string): string {
    if (!text) return '';
    return text.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Sin fecha';
    // Formato simple: Ej. 15 de Mayo, 2024
    const date = new Date(dateString + 'T00:00:00'); // Evita desfase de zona horaria
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}