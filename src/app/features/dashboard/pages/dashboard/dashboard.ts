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

	isParentItem(item: ProjectItemDto): boolean {
		return !!item.code && this.items.some((candidate) => candidate.code?.startsWith(`${item.code}.`));
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
						backgroundColor: 'rgba(59, 130, 246, .10)',
						borderWidth: 3,
						pointRadius: 0,
						pointHoverRadius: 5,
						fill: true,
						tension: 0.4,
					},
					{
						label: 'Ganado (EV)',
						data: evData,
						borderColor: '#10b981',
						backgroundColor: 'rgba(16, 185, 129, .10)',
						borderWidth: 3,
						pointRadius: 0,
						pointHoverRadius: 5,
						fill: true,
						tension: 0.4,
					},
					{
						label: 'Costo Real (AC)',
						data: acData,
						borderColor: '#ef4444',
						backgroundColor: 'rgba(239, 68, 68, .08)',
						borderWidth: 3,
						pointRadius: 0,
						pointHoverRadius: 5,
						fill: true,
						tension: 0.4,
					},
				],
			},
			options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { labels: { usePointStyle: true, padding: 18 } }, tooltip: { callbacks: { label: (context) => ` ${context.dataset.label}: S/ ${Number(context.raw).toLocaleString('es-PE', { minimumFractionDigits: 2 })}` } } }, scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(148, 163, 184, .18)' }, ticks: { callback: (value) => `S/ ${Number(value).toLocaleString('es-PE', { notation: 'compact' })}` } } } },
		});
	}

	initDonutChart() {
		if (this.donutChart) this.donutChart.destroy();

		if (!this.data || !this.donutChartRef) return;

		const resources = [
			{ label: 'Mano de Obra', value: this.data.totalLaborCost, color: '#f59e0b' },
			{ label: 'Equipos', value: this.data.totalEquipmentCost, color: '#8b5cf6' },
			{ label: 'Materiales', value: this.data.totalMaterialCost, color: '#0ea5e9' },
		].filter((resource) => resource.value > 0);
		const totalCost = resources.reduce((total, resource) => total + resource.value, 0);
		const currency = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
		const labels = resources.map((resource) => {
			const percentage = totalCost ? (resource.value / totalCost) * 100 : 0;
			return `${resource.label} — S/ ${currency.format(resource.value)} (${percentage.toFixed(2)}%)`;
		});

		this.donutChart = new Chart(this.donutChartRef.nativeElement, {
			type: 'doughnut',
			data: {
				labels,
				datasets: [
					{
						data: resources.map((resource) => resource.value),
						backgroundColor: resources.map((resource) => resource.color),
						borderColor: '#ffffff',
						borderWidth: 4,
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				cutout: '68%',
				plugins: {
					tooltip: {
						callbacks: {
							label: (context) => ` ${labels[context.dataIndex]}`,
						},
					},
				},
			},
		});
	}
}
