import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
	AfterViewChecked,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	DestroyRef,
	ElementRef,
	Input,
	inject,
	OnDestroy,
	OnInit,
	ViewChild,
	ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { GanttDependencyDto, GanttDependencyType, GanttItemResponseDto } from '../../../../core/models/project.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ProjectService } from '../../../../core/services/project.service';
import { ProjectItemService } from '../../../../core/services/project-item.service';
import { ToastService } from '../../../../core/services/toast-service';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';

type DateRange = { start: Date; end: Date };
type RetrofitGanttTask = {
	id: string;
	name: string;
	start: string;
	end: string;
	progress: number;
	backendItemId: number;
	isParent: boolean;
};

@Component({
	selector: 'app-project-gantt-component',
	imports: [CommonModule, Skeleton, HasPermissionDirective],
	templateUrl: './project-gantt-component.html',
	styleUrl: './project-gantt-component.css',
	encapsulation: ViewEncapsulation.None,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectGanttComponent implements OnInit, AfterViewChecked, OnDestroy {
	@ViewChild('ganttContainer') ganttContainer?: ElementRef<HTMLElement>;

	@Input() projectId!: number;
	@Input() projectStartDate!: string;

	readonly viewModes = ['Day', 'Week', 'Month', 'Year'] as const;
	activeView: (typeof this.viewModes)[number] = 'Day';

	items: GanttItemResponseDto[] = [];
	dependencyItems: GanttItemResponseDto[] = [];
	predecessorCandidates: GanttItemResponseDto[] = [];

	isLoading = true;
	isDownloadingPdf = false;
	isDependencyEditorOpen = false;
	isSavingDependency = false;
	selectedDependencyItemId: number | null = null;
	selectedPredecessorId: number | null = null;
	selectedDependencyType: GanttDependencyType = 'FINISH_TO_START';
	editableDependencies: GanttDependencyDto[] = [];
	readonly dependencyTypes: Array<{ value: GanttDependencyType; label: string }> = [
		{ value: 'FINISH_TO_START', label: 'Fin a inicio (FS)' },
		{ value: 'START_TO_START', label: 'Inicio a inicio (SS)' },
		{ value: 'FINISH_TO_FINISH', label: 'Fin a fin (FF)' },
		{ value: 'START_TO_FINISH', label: 'Inicio a fin (SF)' },
	];
	errorMessage = '';
	canEdit = false;

	private chartTasks: RetrofitGanttTask[] = [];
	private initialScaleChosen = false;
	private dragState: { id: number; mode: 'move' | 'start' | 'end'; initialX: number; start: Date; end: Date; daysPerPixel: number } | null = null;
	private pendingTasks: RetrofitGanttTask[] | null = null;

	private projectItemService = inject(ProjectItemService);
	private projectService = inject(ProjectService);
	private cdr = inject(ChangeDetectorRef);
	private toastService = inject(ToastService);
	private authService = inject(AuthService);
	private destroyRef = inject(DestroyRef);

	ngOnInit(): void {
		this.canEdit = this.authService.hasPermission('PROJECT_UPDATE');
	}

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
		this.chartTasks = [];
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
		this.projectItemService
			.getGanttItems(this.projectId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (backendItems) => {
					this.items = backendItems;
					this.updateDependencyLists();
					const tasks = this.buildTasks(backendItems);
					if (!this.initialScaleChosen && tasks.length) {
						const starts = tasks.map(task => this.parseDate(task.start).getTime());
						const ends = tasks.map(task => this.parseDate(task.end).getTime());
						const span = (Math.max(...ends) - Math.min(...starts)) / 86_400_000;
						this.activeView = span > 730 ? 'Year' : span > 150 ? 'Month' : span > 45 ? 'Week' : 'Day';
						this.initialScaleChosen = true;
					}
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

	private updateDependencyLists(): void {
		const parentIds = new Set(
			this.items.filter((item) => item.parentId != null).map((item) => item.parentId),
		);
		this.dependencyItems = this.items.filter(
			(item) => item.type !== 'project' && !parentIds.has(item.id),
		);
		this.predecessorCandidates = this.dependencyItems.filter(
			(item) => item.id !== this.selectedDependencyItemId,
		);
	}

	private renderChart(tasks: RetrofitGanttTask[]): void {
		if (tasks.length === 0) {
			this.destroyChart();
		} else {
			this.createChart(tasks);
		}
	}

	changeViewMode(mode: (typeof this.viewModes)[number]): void {
		this.activeView = mode;
		this.createChart(this.chartTasks);
		this.cdr.markForCheck();
	}

	toggleDependencyEditor(): void {
		this.isDependencyEditorOpen = !this.isDependencyEditorOpen;
		if (!this.isDependencyEditorOpen) {
			this.selectedDependencyItemId = null;
			this.selectedPredecessorId = null;
			this.editableDependencies = [];
			this.predecessorCandidates = [...this.dependencyItems];
		}
	}

	onDependencyItemChange(value: string): void {
		this.selectedDependencyItemId = value ? Number(value) : null;
		const item = this.dependencyItems.find(
			(candidate) => candidate.id === this.selectedDependencyItemId,
		);
		this.selectedPredecessorId = item?.predecessorId ?? null;
		this.editableDependencies = [...(item?.dependencies ?? [])];
		this.predecessorCandidates = this.dependencyItems.filter(
			(candidate) => candidate.id !== this.selectedDependencyItemId,
		);
	}

	onPredecessorChange(value: string): void {
		this.selectedPredecessorId = value ? Number(value) : null;
	}

	addDependency(): void {
		if (this.selectedPredecessorId == null) return;
		const existing = this.editableDependencies.find((dependency) => dependency.predecessorId === this.selectedPredecessorId);
		if (existing) existing.type = this.selectedDependencyType;
		else this.editableDependencies = [...this.editableDependencies, { predecessorId: this.selectedPredecessorId, type: this.selectedDependencyType }];
		this.selectedPredecessorId = null;
	}

	removeDependency(predecessorId: number): void {
		this.editableDependencies = this.editableDependencies.filter((dependency) => dependency.predecessorId !== predecessorId);
	}

	dependencyLabel(type: GanttDependencyType): string {
		return this.dependencyTypes.find((option) => option.value === type)?.label ?? type;
	}

	predecessorLabel(predecessorId: number): string {
		const item = this.predecessorCandidates.find((candidate) => candidate.id === predecessorId);
		return item ? `${item.code} · ${item.name}` : 'Actividad no disponible';
	}

	saveDependency(): void {
		const item = this.dependencyItems.find(
			(candidate) => candidate.id === this.selectedDependencyItemId,
		);
		if (!item || this.isSavingDependency) return;

		this.isSavingDependency = true;
		this.projectItemService
			.updateGanttDates(this.projectId, item.id, {
				startDate: item.startDate,
				endDate: item.endDate,
				predecessorId: this.editableDependencies[0]?.predecessorId ?? null,
				dependencies: this.editableDependencies,
			})
			.pipe(
				finalize(() => {
					this.isSavingDependency = false;
					this.cdr.markForCheck();
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: () => {
					this.toastService.show('Relación de dependencia actualizada.', 'success');
					this.loadGanttData(true);
				},
				error: (err: HttpErrorResponse) => {
					this.toastService.showApiError(err, 'No se pudo actualizar la relación');
				},
			});
	}

	exportToPdf(): void {
		if (!this.projectId || this.isDownloadingPdf) return;

		this.isDownloadingPdf = true;
		this.cdr.markForCheck();
		this.projectService
			.downloadGanttReport(this.projectId)
			.pipe(
				finalize(() => {
					this.isDownloadingPdf = false;
					this.cdr.markForCheck();
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (blob: Blob) => {
					const url = window.URL.createObjectURL(blob);
					const anchor = document.createElement('a');
					anchor.href = url;
					anchor.download = `cronograma_proyecto_${this.projectId}.pdf`;
					document.body.appendChild(anchor);
					anchor.click();
					anchor.remove();
					window.URL.revokeObjectURL(url);
				},
				error: (err: HttpErrorResponse) => {
					this.toastService.showApiError(err, 'Error al exportar el cronograma');
				},
			});
	}

	private createChart(tasks: RetrofitGanttTask[]): void {
		const host = this.ganttContainer?.nativeElement;
		if (!host) { this.pendingTasks = tasks; return; }
		this.chartTasks = tasks;
		host.replaceChildren();
		if (!tasks.length) return;
		const ns = 'http://www.w3.org/2000/svg';
		const left = 300, top = 56, row = 42;
		const px = { Day: 36, Week: 12, Month: 4, Year: 1.4 }[this.activeView];
		const allDates = tasks.flatMap(t => [this.parseDate(t.start), this.parseDate(t.end)]);
		const origin = this.addDays(new Date(Math.min(...allDates.map(d => d.getTime()))), -7);
		const final = this.addDays(new Date(Math.max(...allDates.map(d => d.getTime()))), 14);
		const days = this.daysBetween(origin, final);
		const width = left + Math.max(800, days * px), height = top + tasks.length * row;
		const pinned = document.createElement('div');
		pinned.className = 'gantt-pinned-labels';
		pinned.style.width = `${left}px`;
		pinned.style.height = `${height}px`;
		pinned.style.marginBottom = `-${height}px`;
		const pinnedHeading = document.createElement('div');
		pinnedHeading.className = 'gantt-pinned-heading';
		pinnedHeading.textContent = 'PARTIDAS Y ACTIVIDADES';
		pinned.appendChild(pinnedHeading);
		tasks.forEach((task, index) => {
			const name = document.createElement('div');
			name.className = `gantt-pinned-row${task.isParent ? ' parent' : ''}`;
			name.style.top = `${top + index * row}px`;
			name.textContent = task.name;
			name.title = task.name;
			pinned.appendChild(name);
		});
		host.appendChild(pinned);
		const svg = document.createElementNS(ns, 'svg');
		svg.setAttribute('width', String(width)); svg.setAttribute('height', String(height));
		svg.setAttribute('class', 'retrofit-custom-gantt');
		svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Cronograma con actividades y relaciones');
		host.appendChild(svg);
		const add = (tag: string, attrs: Record<string, string>, parent: Element = svg) => {
			const node = document.createElementNS(ns, tag);
			Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
			parent.appendChild(node); return node;
		};
		const x = (date: Date) => left + this.daysBetween(origin, date) * px;
		add('rect', { x:'0', y:'0', width:String(width), height:String(height), fill:'#fff' });
		add('rect', { x:'0', y:'0', width:String(width), height:String(top), fill:'#eaf6f4' });
		add('rect', { x:'0', y:'0', width:String(left), height:String(height), fill:'#f8fbfb' });
		for (let index = 1; index < tasks.length; index += 2) {
			add('rect', { x:'0', y:String(top + index * row), width:String(width), height:String(row), fill:'#f7fafb' });
		}
		const heading = add('text', { x:'16', y:'35', class:'custom-gantt-heading' }); heading.textContent = 'PARTIDAS Y ACTIVIDADES';
		for (let d = 0; d <= days; d++) {
			const date = this.addDays(origin, d);
			const show = this.activeView === 'Day' || (this.activeView === 'Week' && date.getDay() === 1)
				|| (this.activeView === 'Month' && date.getDate() === 1)
				|| (this.activeView === 'Year' && date.getDate() === 1 && date.getMonth() === 0);
			if (!show) continue;
			const xx = x(date);
			add('line', { x1:String(xx), x2:String(xx), y1:'0', y2:String(height), class:'custom-gantt-grid' });
			const label = add('text', { x:String(xx + 5), y:'36', class:'custom-gantt-tick' });
			label.textContent = this.activeView === 'Day' ? String(date.getDate()) : this.activeView === 'Year' ? String(date.getFullYear())
				: this.activeView === 'Month' ? date.toLocaleDateString('es-PE', {month:'short',year:'2-digit'}) : `${date.getDate()}/${date.getMonth()+1}`;
			if (this.activeView === 'Day' && date.getDate() === 1) {
				const month = add('text', { x:String(xx+5), y:'15', class:'custom-gantt-month' });
				month.textContent = date.toLocaleDateString('es-PE', {month:'long',year:'numeric'});
			}
		}
		const bars = new Map<number, {a:number;b:number;y:number}>();
		tasks.forEach((task, i) => {
			const y = top + i*row + row/2;
			add('line', {x1:'0',x2:String(width),y1:String(top+(i+1)*row),y2:String(top+(i+1)*row),class:'custom-gantt-row-line'});
			const name = add('text', {x:task.isParent?'16':'30',y:String(y+4),class:task.isParent?'custom-gantt-parent-label':'custom-gantt-label'});
			name.textContent = task.name.length > 39 ? task.name.slice(0,36)+'…' : task.name;
			add('title', {}, name).textContent = task.name;
			const a = x(this.parseDate(task.start)), b = x(this.addDays(this.parseDate(task.end),1));
			bars.set(task.backendItemId,{a,b,y});
			const bar = add('rect',{x:String(a),y:String(y-12),width:String(Math.max(b-a,4)),height:'24',rx:'5',class:task.isParent?'custom-gantt-parent-bar':'custom-gantt-bar','data-id':String(task.backendItemId),'data-mode':'move'});
			add('title',{},bar).textContent = `${task.name}: ${task.start} — ${task.end}`;
			if (!task.isParent) {
				add('rect',{x:String(a),y:String(y-12),width:String(Math.max(0,(b-a)*task.progress/100)),height:'24',class:'custom-gantt-progress','pointer-events':'none'});
				if (this.canEdit) for (const [mode,xx] of [['start',a],['end',b]] as const)
					add('rect',{x:String(xx-5),y:String(y-14),width:'10',height:'28',rx:'3',class:'custom-gantt-handle','data-id':String(task.backendItemId),'data-mode':mode});
			}
		});
		const links = add('g', {class:'custom-gantt-links','pointer-events':'none'});
		for (const item of this.items) for (const dep of this.itemDependencies(item)) {
			const source = bars.get(dep.predecessorId), target = bars.get(item.id);
			if (!source || !target) continue;
			const type = dep.type ?? 'FINISH_TO_START';
			const sx = type.startsWith('START') ? source.a : source.b;
			const tx = type.endsWith('START') ? target.a : target.b;
			const elbow = tx > sx+30 ? (sx+tx)/2 : sx-22;
			add('path',{d:`M ${sx} ${source.y} H ${elbow} V ${target.y} H ${tx}`,class:`custom-gantt-link ${type.toLowerCase()}`},links);
			add('circle',{cx:String(tx),cy:String(target.y),r:'3',class:'custom-gantt-link-end'},links);
			const code = add('text',{x:String(elbow+4),y:String((source.y+target.y)/2-4),class:'custom-gantt-link-label'},links);
			code.textContent = {FINISH_TO_START:'FS',START_TO_START:'SS',FINISH_TO_FINISH:'FF',START_TO_FINISH:'SF'}[type];
		}
		if (this.canEdit) {
			svg.addEventListener('pointerdown', event => {
				const target = event.target as SVGElement, id = Number(target.getAttribute('data-id'));
				const mode = target.getAttribute('data-mode') as 'move'|'start'|'end'|null;
				const task = tasks.find(t => t.backendItemId === id);
				if (!task || task.isParent || !mode) return;
				this.dragState = {id,mode,initialX:event.clientX,start:this.parseDate(task.start),end:this.parseDate(task.end),daysPerPixel:1/px};
				svg.setPointerCapture(event.pointerId);
			});
			svg.addEventListener('pointermove', event => {
				const drag = this.dragState;
				if (!drag) return;
				const delta = Math.round((event.clientX - drag.initialX) * drag.daysPerPixel) * px;
				const bar = Array.from(svg.querySelectorAll<SVGRectElement>('.custom-gantt-bar'))
					.find(node => node.getAttribute('data-id') === String(drag.id));
				if (!bar) return;
				const original = bars.get(drag.id);
				if (!original) return;
				if (drag.mode === 'move') {
					bar.setAttribute('x', String(original.a + delta));
				} else if (drag.mode === 'start' && original.b - original.a - delta >= px) {
					bar.setAttribute('x', String(original.a + delta));
					bar.setAttribute('width', String(original.b - original.a - delta));
				} else if (drag.mode === 'end' && original.b - original.a + delta >= px) {
					bar.setAttribute('width', String(original.b - original.a + delta));
				}
			});
			svg.addEventListener('pointerup', event => {
				const drag = this.dragState; this.dragState = null;
				if (!drag) return;
				const shift = Math.round((event.clientX-drag.initialX)*drag.daysPerPixel);
				if (!shift) return;
				const start = this.addDays(drag.start, drag.mode === 'end' ? 0 : shift);
				const end = this.addDays(drag.end, drag.mode === 'start' ? 0 : shift);
				if (end < start) { this.toastService.show('La duración debe ser de al menos un día.','error'); this.createChart(tasks); return; }
				const task = tasks.find(t => t.backendItemId === drag.id);
				if (task) this.handleDateChange(task,start,end);
			});
			svg.addEventListener('pointercancel',()=>{this.dragState=null;});
		}
	}

	private daysBetween(from: Date, to: Date): number {
		return Math.round((Date.UTC(to.getFullYear(),to.getMonth(),to.getDate())-Date.UTC(from.getFullYear(),from.getMonth(),from.getDate()))/86_400_000);
	}

	private itemDependencies(item: GanttItemResponseDto): GanttDependencyDto[] {
		return item.dependencies?.length
			? item.dependencies
			: item.predecessorId != null
				? [{ predecessorId: item.predecessorId, type: 'FINISH_TO_START' }]
				: [];
	}


	private handleDateChange(task: RetrofitGanttTask, start: Date, end: Date): void {
		if (task.isParent) {
			this.loadGanttData(true);
			return;
		}

		const updateDto = {
			startDate: this.toIsoDate(start),
			// El backend guarda endDate como límite exclusivo; la barra usa fecha final inclusiva.
			endDate: this.toIsoDate(this.addDays(end, 1)),
			predecessorId: this.itemDependencies(this.items.find(item => item.id === task.backendItemId)!)[0]?.predecessorId ?? null,
			dependencies: this.itemDependencies(this.items.find(item => item.id === task.backendItemId)!),
		};

		this.projectItemService
			.updateGanttDates(this.projectId, task.backendItemId, updateDto)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
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
			ranges.set(
				item.id,
				this.resolveRange(item, itemById, childrenByParent, rangeCache, new Set()),
			);
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
				backendItemId: item.id,
				isParent,
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
		const start = item.startDate
			? this.parseDate(item.startDate)
			: this.parseDate(this.projectStartDate);
		const end = item.endDate
			? this.addDays(this.parseDate(item.endDate), -1)
			: this.addDays(start, Math.max(item.baseDurationDays || 1, 1) - 1);
		return { start, end: end < start ? start : end };
	}

	private destroyChart(): void {
		this.chartTasks = [];
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
