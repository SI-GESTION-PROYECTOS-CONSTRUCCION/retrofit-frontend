import { HttpErrorResponse } from '@angular/common/http';
import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ElementRef,
	AfterViewChecked,
	Input,
	OnDestroy,
	ViewChild,
	ViewEncapsulation,
} from '@angular/core';
import Gantt, { FrappeGanttOptions, FrappeGanttTask, FrappeGanttViewMode } from 'frappe-gantt';
import { GanttItemResponseDto } from '../../../../core/models/project.model';
import { ProjectItemService } from '../../../../core/services/project-item.service';
import { ProjectService } from '../../../../core/services/project.service';
import { ToastService } from '../../../../core/services/toast-service';

type DateRange = { start: Date; end: Date };
type RetrofitGanttTask = FrappeGanttTask & {
	backendItemId: number;
	isParent: boolean;
	predecessorId: number | null;
};

@Component({
	selector: 'app-project-gantt-component',
	imports: [],
	templateUrl: './project-gantt-component.html',
	styleUrl: './project-gantt-component.css',
	encapsulation: ViewEncapsulation.None,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectGanttComponent implements AfterViewChecked, OnDestroy {
	@ViewChild('ganttContainer') ganttContainer?: ElementRef<HTMLElement>;

	@Input() projectId!: number;
	@Input() projectStartDate!: string;

	readonly viewModes = ['Day', 'Week', 'Month', 'Year'] as const;
	// Frappe inicia con el primer modo configurado (Day), por lo que el selector
	// debe comenzar en el mismo modo para no mostrar una escala distinta a la activa.
	activeView: (typeof this.viewModes)[number] = 'Day';

	items: GanttItemResponseDto[] = [];
	isLoading = true;
	isDownloadingPdf = false;
	isDependencyEditorOpen = false;
	isSavingDependency = false;
	selectedDependencyItemId: number | null = null;
	selectedPredecessorId: number | null = null;
	errorMessage = '';

	private gantt: Gantt | null = null;
	private pendingTasks: RetrofitGanttTask[] | null = null;

	constructor(
		private projectItemService: ProjectItemService,
		private projectService: ProjectService,
		private cdr: ChangeDetectorRef,
		private toastService: ToastService,
	) {}

	ngAfterViewInit(): void {
		this.loadGanttData();
	}

	ngAfterViewChecked(): void {
		if (!this.pendingTasks || !this.ganttContainer?.nativeElement) return;

		const tasks = this.pendingTasks;
		this.pendingTasks = null;
		this.renderChart(tasks);
	}

	ngOnDestroy(): void {
		this.pendingTasks = null;
		this.gantt = null;
		if (this.ganttContainer?.nativeElement) {
			this.ganttContainer.nativeElement.innerHTML = '';
		}
	}

	loadGanttData(silent = false): void {
		if (!this.projectId) return;

		if (!silent) {
			this.isLoading = true;
			this.errorMessage = '';
			this.pendingTasks = null;
			this.destroyChart();
		}
		this.projectItemService.getGanttItems(this.projectId).subscribe({
			next: (backendItems) => {
				this.items = backendItems;
				const tasks = this.buildTasks(backendItems);
				if (!silent) this.isLoading = false;
				this.pendingTasks = tasks;
				this.cdr.markForCheck();
			},
			error: (err: HttpErrorResponse) => {
				if (!silent) {
					this.pendingTasks = null;
					this.isLoading = false;
					this.errorMessage = 'No se pudo cargar el cronograma del proyecto.';
				}
				this.toastService.showApiError(err, 'Error cargando el cronograma');
				this.cdr.markForCheck();
			},
		});
	}

	private renderChart(tasks: RetrofitGanttTask[]): void {
		if (tasks.length === 0) {
			this.destroyChart();
		} else if (this.gantt) {
			this.gantt.refresh(tasks);
		} else {
			this.createChart(tasks);
		}
	}

	changeViewMode(mode: (typeof this.viewModes)[number]): void {
		this.activeView = mode;
		// Frappe only recalculates the date range when the mode is changed without
		// preserving the previous horizontal position. Preserving it leaves the old
		// grid dimensions in place and offsets bars in Week, Month and Year views.
		this.gantt?.change_view_mode(mode);
		this.cdr.markForCheck();
	}

	get dependencyItems(): GanttItemResponseDto[] {
		const parentIds = new Set(this.items.filter((item) => item.parentId != null).map((item) => item.parentId));
		return this.items.filter((item) => item.type !== 'project' && !parentIds.has(item.id));
	}

	get predecessorCandidates(): GanttItemResponseDto[] {
		return this.dependencyItems.filter((item) => item.id !== this.selectedDependencyItemId);
	}

	toggleDependencyEditor(): void {
		this.isDependencyEditorOpen = !this.isDependencyEditorOpen;
		if (!this.isDependencyEditorOpen) {
			this.selectedDependencyItemId = null;
			this.selectedPredecessorId = null;
		}
	}

	onDependencyItemChange(value: string): void {
		this.selectedDependencyItemId = value ? Number(value) : null;
		const item = this.dependencyItems.find((candidate) => candidate.id === this.selectedDependencyItemId);
		this.selectedPredecessorId = item?.predecessorId ?? null;
	}

	onPredecessorChange(value: string): void {
		this.selectedPredecessorId = value ? Number(value) : null;
	}

	saveDependency(): void {
		const item = this.dependencyItems.find((candidate) => candidate.id === this.selectedDependencyItemId);
		if (!item || this.isSavingDependency) return;

		this.isSavingDependency = true;
		this.projectItemService.updateGanttDates(this.projectId, item.id, {
			startDate: item.startDate,
			endDate: item.endDate,
			predecessorId: this.selectedPredecessorId,
		}).subscribe({
			next: () => {
				this.isSavingDependency = false;
				this.toastService.show('Relación de dependencia actualizada.', 'success');
				this.loadGanttData(true);
				this.cdr.markForCheck();
			},
			error: (err: HttpErrorResponse) => {
				this.isSavingDependency = false;
				this.toastService.showApiError(err, 'No se pudo actualizar la relación');
				this.cdr.markForCheck();
			},
		});
	}

	exportToPdf(): void {
		if (!this.projectId || this.isDownloadingPdf) return;

		this.isDownloadingPdf = true;
		this.projectService.downloadGanttReport(this.projectId).subscribe({
			next: (blob: Blob) => {
				const url = window.URL.createObjectURL(blob);
				const anchor = document.createElement('a');
				anchor.href = url;
				anchor.download = `cronograma_proyecto_${this.projectId}.pdf`;
				document.body.appendChild(anchor);
				anchor.click();
				anchor.remove();
				window.URL.revokeObjectURL(url);
				this.isDownloadingPdf = false;
				this.cdr.markForCheck();
			},
			error: (err: HttpErrorResponse) => {
				this.isDownloadingPdf = false;
				this.toastService.showApiError(err, 'Error al exportar el cronograma');
				this.cdr.markForCheck();
			},
		});
	}

	private createChart(tasks: RetrofitGanttTask[]): void {
		const container = this.ganttContainer?.nativeElement;
		if (!container) {
			this.pendingTasks = tasks;
			return;
		}

		const options: FrappeGanttOptions = {
			view_mode: this.activeView,
			view_modes: this.buildViewModes(tasks, container.clientWidth),
			language: 'es',
			bar_height: 32,
			padding: 20,
			lines: 'vertical',
			readonly_progress: true,
			readonly_dates: false,
			popup_on: 'click',
			scroll_to: 'start',
			today_button: false,
			infinite_padding: false,
			holidays: { 'var(--g-weekend-highlight-color)': 'weekend' },
			popup: ({ task, set_title, set_subtitle, set_details }) => {
				const retrofitTask = task as RetrofitGanttTask;
				set_title(`${retrofitTask.name}`);
				set_subtitle(retrofitTask.isParent ? 'Grupo de partidas' : 'Partida ejecutable');
				set_details(
					`${this.formatDate(retrofitTask.start)} — ${this.formatDate(retrofitTask.end)}<br/>Avance: ${Math.round(retrofitTask.progress)}%`,
				);
			},
			on_date_change: (task, start, end) => this.handleDateChange(task as RetrofitGanttTask, start, end),
		};

		this.gantt = new Gantt(container, tasks, options);
	}

	private buildViewModes(tasks: RetrofitGanttTask[], containerWidth: number): FrappeGanttViewMode[] {
		const dates = tasks.flatMap((task) => [this.parseDate(task.start), this.parseDate(task.end)]);
		const firstDate = new Date(Math.min(...dates.map((date) => date.getTime())));
		const lastDate = new Date(Math.max(...dates.map((date) => date.getTime())));
		const projectDays = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / 86_400_000) + 1);
		const projectMonths =
			(lastDate.getFullYear() - firstDate.getFullYear()) * 12 + lastDate.getMonth() - firstDate.getMonth() + 1;
		const projectYears = lastDate.getFullYear() - firstDate.getFullYear() + 1;
		const usableWidth = Math.max(containerWidth, 720);
		const weekWidth = Math.max(92, Math.ceil(usableWidth / Math.ceil((projectDays + 28) / 7)));
		const monthWidth = Math.max(160, Math.ceil(usableWidth / (projectMonths + 2)));
		const yearWidth = Math.max(220, Math.ceil(usableWidth / (projectYears + 2)));

		const monthName = (date: Date, short = false): string => {
			const value = date.toLocaleDateString('es-PE', { month: short ? 'short' : 'long' }).replace('.', '');
			return value.charAt(0).toUpperCase() + value.slice(1);
		};
		const isNewMonth = (date: Date, previous: Date | null): boolean =>
			!previous || date.getMonth() !== previous.getMonth() || date.getFullYear() !== previous.getFullYear();

		return [
			{
				name: 'Day', padding: '7d', step: '1d', date_format: 'YYYY-MM-DD', column_width: 52,
				lower_text: (date) => String(date.getDate()).padStart(2, '0'),
				upper_text: (date, previous) => (isNewMonth(date, previous) ? monthName(date) : ''),
				thick_line: (date) => date.getDay() === 1,
			},
			{
				name: 'Week', padding: '14d', step: '7d', date_format: 'YYYY-MM-DD', column_width: weekWidth,
				lower_text: (date, previous) => {
					const end = this.addDays(date, 6);
					const startLabel = isNewMonth(date, previous) ? `${date.getDate()} ${monthName(date, true).toLowerCase()}` : String(date.getDate());
					const endLabel = end.getMonth() !== date.getMonth() ? `${end.getDate()} ${monthName(end, true).toLowerCase()}` : String(end.getDate());
					return `${startLabel} – ${endLabel}`;
				},
				upper_text: (date, previous) => (isNewMonth(date, previous) ? monthName(date) : ''),
				thick_line: (date) => date.getDate() <= 7,
			},
			{
				name: 'Month', padding: '1m', step: '1m', date_format: 'YYYY-MM', column_width: monthWidth,
				lower_text: (date) => monthName(date),
				upper_text: (date, previous) => (!previous || date.getFullYear() !== previous.getFullYear() ? String(date.getFullYear()) : ''),
				thick_line: (date) => date.getMonth() % 3 === 0,
				snap_at: '7d',
			},
			{
				name: 'Year', padding: '1y', step: '1y', date_format: 'YYYY', column_width: yearWidth,
				lower_text: (date) => String(date.getFullYear()),
				upper_text: () => '',
				snap_at: '30d',
			},
		];
	}

	private handleDateChange(task: RetrofitGanttTask, start: Date, end: Date): void {
		if (task.isParent) {
			this.loadGanttData(true);
			return;
		}

		const updateDto = {
			startDate: this.toIsoDate(start),
			// El backend guarda endDate como límite exclusivo; Frappe trabaja con fecha final inclusiva.
			endDate: this.toIsoDate(this.addDays(end, 1)),
			predecessorId: task.predecessorId,
		};

		this.projectItemService.updateGanttDates(this.projectId, task.backendItemId, updateDto).subscribe({
			next: () => {
				this.toastService.show('Partida actualizada correctamente.', 'success');
				this.loadGanttData(true);
			},
			error: (err: HttpErrorResponse) => {
				this.toastService.showApiError(err, 'Error al guardar la partida');
				this.loadGanttData();
			},
		});
	}

	private buildTasks(items: GanttItemResponseDto[]): RetrofitGanttTask[] {
		const childrenByParent = new Map<number, GanttItemResponseDto[]>();
		for (const item of items) {
			if (item.parentId != null) {
				const children = childrenByParent.get(item.parentId) ?? [];
				children.push(item);
				childrenByParent.set(item.parentId, children);
			}
		}

		const rangeCache = new Map<number, DateRange>();
		const itemById = new Map(items.map((item) => [item.id, item]));
		const ranges = new Map<number, DateRange>();
		for (const item of items) {
			ranges.set(item.id, this.resolveRange(item, itemById, childrenByParent, rangeCache, new Set()));
		}

		return items.map((item) => {
			const range = ranges.get(item.id) ?? this.fallbackRange(item);
			const children = childrenByParent.get(item.id) ?? [];
			const isParent = item.type === 'project' || children.length > 0;

			return {
				id: String(item.id),
				name: `${item.code} · ${item.name}`,
				start: this.toIsoDate(range.start),
				end: this.toIsoDate(range.end),
				progress: this.clampProgress(item.currentProgressPercentage),
				dependencies: item.predecessorId != null ? String(item.predecessorId) : undefined,
				custom_class: isParent ? 'retrofit-parent-task' : 'retrofit-task',
				description: item.name,
				backendItemId: item.id,
				isParent,
				predecessorId: item.predecessorId,
			};
		});
	}

	private resolveRange(
		item: GanttItemResponseDto,
		itemById: Map<number, GanttItemResponseDto>,
		childrenByParent: Map<number, GanttItemResponseDto[]>,
		cache: Map<number, DateRange>,
		visiting: Set<number>,
	): DateRange {
		const cached = cache.get(item.id);
		if (cached) return cached;
		if (visiting.has(item.id)) return this.fallbackRange(item);

		visiting.add(item.id);
		const ownStart = item.startDate ? this.parseDate(item.startDate) : null;
		const ownEnd = item.endDate ? this.addDays(this.parseDate(item.endDate), -1) : null;
		const children = childrenByParent.get(item.id) ?? [];
		const childRanges = children.map((child) =>
			this.resolveRange(child, itemById, childrenByParent, cache, visiting),
		);

		let start = ownStart ?? this.parseDate(this.projectStartDate);
		let end = ownEnd ?? this.addDays(start, Math.max(item.baseDurationDays || 1, 1) - 1);
		for (const childRange of childRanges) {
			if (childRange.start < start) start = childRange.start;
			if (childRange.end > end) end = childRange.end;
		}

		const range = { start, end };
		cache.set(item.id, range);
		visiting.delete(item.id);
		return range;
	}

	private fallbackRange(item: GanttItemResponseDto): DateRange {
		const start = item.startDate ? this.parseDate(item.startDate) : this.parseDate(this.projectStartDate);
		const end = item.endDate
			? this.addDays(this.parseDate(item.endDate), -1)
			: this.addDays(start, Math.max(item.baseDurationDays || 1, 1) - 1);
		return { start, end: end < start ? start : end };
	}

	private destroyChart(): void {
		this.gantt = null;
		if (this.ganttContainer?.nativeElement) {
			this.ganttContainer.nativeElement.innerHTML = '';
		}
	}

	private parseDate(value: string | undefined): Date {
		if (!value) {
			const today = new Date();
			return new Date(today.getFullYear(), today.getMonth(), today.getDate());
		}
		const [year, month, day] = value.split('-').map(Number);
		return new Date(year, month - 1, day);
	}

	private addDays(date: Date, days: number): Date {
		const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
		result.setDate(result.getDate() + days);
		return result;
	}

	private toIsoDate(date: Date): string {
		return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
			.map((value, index) => (index === 0 ? String(value) : String(value).padStart(2, '0')))
			.join('-');
	}

	private formatDate(value: string | Date): string {
		const date = value instanceof Date ? value : this.parseDate(value);
		return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	private clampProgress(progress: number | null | undefined): number {
		return Math.max(0, Math.min(100, progress ?? 0));
	}
}
