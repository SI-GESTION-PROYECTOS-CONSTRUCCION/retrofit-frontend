import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ProjectDashboardResponseDto } from '../../../../core/models/dashboard.model';
import { ProjectItemDto, ProjectResponseDto } from '../../../../core/models/project.model';
import { DashboardService } from '../../../../core/services/dashboard.service';
import { ProjectService } from '../../../../core/services/project.service';
import { ProjectItemService } from '../../../../core/services/project-item.service';
import { ToastService } from '../../../../core/services/toast-service';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';

Chart.register(...registerables);

@Component({
	selector: 'app-dashboard',
	imports: [CommonModule, FormsModule, Skeleton, RouterModule, SelectModule, TooltipModule],
	templateUrl: './dashboard.html',
	styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit {
	@ViewChild('sCurveChart') sCurveChartRef!: ElementRef;
	@ViewChild('donutChart') donutChartRef!: ElementRef;

	private dashboardService = inject(DashboardService);
	private projectService = inject(ProjectService);
	private projectItemService = inject(ProjectItemService);
	private toastService = inject(ToastService);

	data: ProjectDashboardResponseDto | null = null;
	isLoading = true;

	projects: ProjectResponseDto[] = [];
	selectedProjectId: number | null = null;

	items: ProjectItemDto[] = [];
	selectedItemId: number | null = null;

	// Instancias de los gráficos para destruirlos si cambiamos de proyecto
	sCurveChart: Chart | undefined;
	donutChart: Chart | undefined;

	ngOnInit(): void {
		this.loadProjects();
	}

	loadProjects() {
		this.projectService.getProjects(0, 100).subscribe({
			next: (res) => {
				this.projects = res.content;

				if (this.projects && this.projects.length > 0) {
					const projectId = this.projects[0].id;
					this.selectedProjectId = projectId;
					this.loadItems(projectId);
					this.loadDashboard(projectId);
				} else {
					this.isLoading = false;
				}
			},
			error: (_err: HttpErrorResponse) => {
				this.toastService.show('Error cargando proyectos para el selector', 'error');
				this.isLoading = false;
			},
		});
	}

	// Evento cuando el gerente cambia de proyecto en el dropdown
	onProjectChange() {
		if (this.selectedProjectId) {
			this.selectedItemId = null; // Reiniciar partida
			this.loadItems(Number(this.selectedProjectId));
			this.loadDashboard(Number(this.selectedProjectId), this.selectedItemId);
		}
	}

	loadItems(projectId: number) {
		this.projectItemService.getItems(projectId).subscribe({
			next: (items) => {
				this.items = items;
			},
			error: (_err: HttpErrorResponse) => {
				this.toastService.show('Error cargando partidas', 'error');
			},
		});
	}

	onItemChange() {
		if (this.selectedProjectId) {
			this.loadDashboard(Number(this.selectedProjectId), this.selectedItemId);
		}
	}

	loadDashboard(projectId: number, itemId?: number | null) {
		this.isLoading = true;
		this.dashboardService.getProjectDashboard(projectId, itemId).subscribe({
			next: (res) => {
				this.data = res;
				this.isLoading = false;
				this.renderCharts();
			},
			error: (_err: HttpErrorResponse) => {
				this.toastService.show('Error cargando dashboard', 'error');
				this.isLoading = false;
			},
		});
	}

	renderCharts() {
		setTimeout(() => {
			this.initSCurveChart();
			this.initDonutChart();
		}, 100);
	}

	initSCurveChart() {
		if (this.sCurveChart) this.sCurveChart.destroy();

		if (!this.data || !this.sCurveChartRef) return;

		const labels = this.data.timeEvolution.map((t) => t.dateLabel);
		const pvData = this.data.timeEvolution.map((t) => t.plannedValueAccumulated);
		const evData = this.data.timeEvolution.map((t) => t.earnedValueAccumulated);
		const acData = this.data.timeEvolution.map((t) => t.actualCostAccumulated);

		this.sCurveChart = new Chart(this.sCurveChartRef.nativeElement, {
			type: 'line',
			data: {
				labels: labels,
				datasets: [
					{
						label: 'Planeado (PV)',
						data: pvData,
						borderColor: '#3b82f6',
						backgroundColor: '#3b82f6',
						tension: 0.4,
					},
					{
						label: 'Ganado (EV)',
						data: evData,
						borderColor: '#10b981',
						backgroundColor: '#10b981',
						tension: 0.4,
					},
					{
						label: 'Costo Real (AC)',
						data: acData,
						borderColor: '#ef4444',
						backgroundColor: '#ef4444',
						tension: 0.4,
					},
				],
			},
			options: { responsive: true, maintainAspectRatio: false },
		});
	}

	initDonutChart() {
		if (this.donutChart) this.donutChart.destroy();

		if (!this.data || !this.donutChartRef) return;

		this.donutChart = new Chart(this.donutChartRef.nativeElement, {
			type: 'doughnut',
			data: {
				labels: ['Mano de Obra', 'Equipos', 'Materiales'],
				datasets: [
					{
						data: [
							this.data.totalLaborCost,
							this.data.totalEquipmentCost,
							this.data.totalMaterialCost,
						],
						backgroundColor: ['#f59e0b', '#8b5cf6', '#0ea5e9'],
					},
				],
			},
			options: { responsive: true, maintainAspectRatio: false },
		});
	}
}
