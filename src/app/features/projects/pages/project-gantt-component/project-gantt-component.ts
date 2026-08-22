import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ElementRef,
	Input,
	ViewChild,
	ViewEncapsulation,
} from '@angular/core';
import { gantt } from 'dhtmlx-gantt';
import { ProjectItemService } from '../../../../core/services/project-item.service';
import { ToastService } from '../../../../core/services/toast-service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
	selector: 'app-project-gantt-component',
	imports: [],
	templateUrl: './project-gantt-component.html',
	styleUrl: './project-gantt-component.css',
	encapsulation: ViewEncapsulation.None,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectGanttComponent {
	@ViewChild('ganttContainer', { static: true }) ganttContainer!: ElementRef;

	@Input() projectId!: number;
	@Input() projectStartDate!: string;

	constructor(
		private projectService: ProjectItemService,
		private cdr: ChangeDetectorRef,
		private toastService: ToastService
	) {}

	ngOnInit(): void {}

	ngAfterViewInit(): void {
		// 1. Configuración básica
		gantt.config.date_format = '%Y-%m-%d';
		gantt.config.drag_links = true;
		gantt.config.drag_progress = false;
		gantt.config.columns = [
			{ name: 'code', label: 'Item', width: 80, resize: true },
			{ name: 'text', label: 'Partida', width: 200, tree: true, resize: true },
			{ name: 'start_date', label: 'Inicio', align: 'center', width: 120, resize: true },
			{ name: 'duration', label: 'Días', align: 'center', width: 60, resize: true },
			{
				name: 'progress',
				label: 'Avance',
				align: 'center',
				width: 70,
				resize: true,
				template: (item: { progress?: number }) => {
					if (!item.progress) return '0%';
					return `${Math.round(item.progress * 100)}%`;
				},
			},
		];

		gantt.attachEvent('onAfterTaskDrag', (id: string | number, _mode: string, _e: Event) => {
			this.saveTaskChanges(id);
		});

		// EVENTO 2: Cuando el usuario conecta una flecha (crea dependencia)
		gantt.attachEvent('onAfterLinkAdd', (_id: string | number, link: { target: string | number }) => {
			// link.source es el padre, link.target es el hijo
			this.saveTaskChanges(link.target);
		});

		// EVENTO 3: Cuando el usuario borra una flecha
		gantt.attachEvent('onAfterLinkDelete', (_id: string | number, link: { target: string | number }) => {
			this.saveTaskChanges(link.target);
		});

		gantt.templates.task_class = (_start: Date, _end: Date, task: { type?: string, id: string | number }) => {
			if (task.type === 'project' || gantt.hasChild(task.id)) {
				return 'mi-barra-padre';
			}
			return 'mi-barra-hija';
		};

		gantt.init(this.ganttContainer.nativeElement);

		this.loadGanttData();
	}

	saveTaskChanges(taskId: string | number): void {
		const task = gantt.getTask(taskId);

		// Convertimos la fecha de DHTMLX (Date) a texto "YYYY-MM-DD" para Java
		const formatFunc = gantt.date.date_to_str('%Y-%m-%d');

		let predecessorId: number | null = null;

		// Accedemos a la propiedad interna $target que guarda las flechas que ENTRAN
		const incomingLinks = (task as { $target?: string[] }).$target;

		if (incomingLinks && incomingLinks.length > 0) {
			// Tomamos la primera flecha entrante
			const linkId = incomingLinks[0];
			const linkObj = gantt.getLink(linkId);
			predecessorId = Number(linkObj.source); // El ID de la tarea padre
		}

		// Armamos el paquete para Java
		const updateDto = {
			startDate: formatFunc(task.start_date),
			endDate: formatFunc(task.end_date),
			predecessorId: predecessorId,
		};

		// Llamamos al Backend pasándole el ID del Proyecto y el ID de la Partida
		this.projectService.updateGanttDates(this.projectId, Number(taskId), updateDto).subscribe({
			next: () => {
				console.log(`Partida ${taskId} actualizada correctamente en BD.`);
				this.loadGanttData();
				this.cdr.markForCheck();
			},
			error: (err: HttpErrorResponse) => {
				this.toastService.showApiError(err, 'Error al guardar la partida');
				this.cdr.markForCheck();
			},
		});
	}

	loadGanttData(): void {
		if (!this.projectId) return;

		// By removing the hardcoded start_date and end_date,
		// DHTMLX Gantt will automatically scale to fit all tasks.
		gantt.config.start_date = undefined;
		gantt.config.end_date = undefined;
		// We can also ensure it fits the tasks
		gantt.config.fit_tasks = true;

		this.projectService.getGanttItems(this.projectId).subscribe({
			next: (backendItems) => {
				// OPTIMIZACIÓN: Crear Set de parentIds (O(N)) en lugar de buscar con .some() dentro del map
				const parentIds = new Set(backendItems.map((b) => b.parentId));

				const tasks = backendItems.map((item) => {
					// 1. Detectamos si esta partida tiene hijos en la lista (O(1))
					const hasChildren = parentIds.has(item.id);

					// Es padre si el backend lo dice, o si tiene hijas adentro
					const isParent = item.type === 'project' || hasChildren;

					const taskObj: {
						id: number;
						code: string;
						text: string;
						progress: number;
						parent: number;
						type: string;
						open: boolean;
						start_date?: string;
						duration?: number;
					} = {
						id: item.id,
						code: item.code,
						text: item.name,
						progress: item.currentProgressPercentage / 100,
						parent: item.parentId ? item.parentId : 0,

						type: isParent ? 'project' : 'task',
						open: true,
					};

					if (!isParent) {
						taskObj.start_date = item.startDate ? item.startDate : this.projectStartDate;
						taskObj.duration = item.baseDurationDays;
					}

					return taskObj;
				});

				// TRADUCTOR DE DEPENDENCIAS (Flechas)
				const links = backendItems
					.filter((item) => item.predecessorId != null)
					.map((item, index) => ({
						id: index + 1,
						source: item.predecessorId as number,
						target: item.id,
						type: '0',
					}));

				// 3. Limpiar y dibujar
				gantt.clearAll();
				gantt.parse({ data: tasks, links: links });
				this.cdr.markForCheck();
			},
			error: (err: HttpErrorResponse) => {
				this.toastService.showApiError(err, 'Error cargando el Gantt');
				this.cdr.markForCheck();
			},
		});
	}
}
