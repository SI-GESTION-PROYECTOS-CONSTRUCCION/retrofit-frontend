import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	DestroyRef,
	Input,
	inject,
	OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
	FormArray,
	FormBuilder,
	FormGroup,
	FormsModule,
	ReactiveFormsModule,
} from '@angular/forms';
import { debounceTime, finalize } from 'rxjs';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { Resizable } from '../../../../core/directives/resizable';
import {
	BudgetSaveRequestDto,
	ProjectItemDto,
	ProjectItemResourceResponseDto,
	ProjectResponseDto,
} from '../../../../core/models/project.model';
import { ResourceType } from '../../../../core/models/resource.model';
import { ProjectService } from '../../../../core/services/project.service';
import { ProjectItemService } from '../../../../core/services/project-item.service';
import { ToastService } from '../../../../core/services/toast-service';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { ApuModalComponent } from '../../modal/apu-modal-component/apu-modal-component';

export type CellColumn = 'description' | 'unit' | 'totalQuantity' | 'unitPrice';

export interface ActiveCell {
	rowIdx: number;
	col: CellColumn;
}

@Component({
	selector: 'app-project-budget',
	standalone: true,
	imports: [
		CommonModule,
		ReactiveFormsModule,
		FormsModule,
		ApuModalComponent,
		Resizable,
		HasPermissionDirective,
		Skeleton,
	],
	templateUrl: './project-budget-component.html',
	styleUrls: ['./project-budget-component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectBudgetComponent implements OnInit {
	@Input({ required: true }) projectId!: number;
	@Input() projectInfo: ProjectResponseDto | null = null;

	public ResourceType = ResourceType;

	private fb = inject(FormBuilder);
	private itemService = inject(ProjectItemService);
	private toastService = inject(ToastService);
	private projectService = inject(ProjectService);
	private cdr = inject(ChangeDetectorRef);
	private destroyRef = inject(DestroyRef);
	project: ProjectResponseDto | null = null;
	budgetForm!: FormGroup;
	isLoading = false;

	activeCell: ActiveCell | null = null;
	private blurTimeout: ReturnType<typeof setTimeout> | null = null;

	private readonly MIN_EMPTY_ROWS = 5;
	isApuModalOpen = false;
	selectedItemIndex: number | null = null;
	selectedItemData: ProjectItemDto | null = null;
	expandedRows: { [key: number]: boolean } = {};

	generalExpensesPercentage: number = 5.0;
	utilityPercentage: number = 4.0;

	directCost: number = 0;
	generalExpenses: number = 0;
	utility: number = 0;
	subtotal: number = 0;
	igv: number = 0;
	grandTotal: number = 0;

	preventNegative(event: KeyboardEvent) {
		if (event.key === '-' || event.key === 'e') {
			event.preventDefault();
		}
	}

	ngOnInit() {
		this.loadProjectDetails();
		this.budgetForm = this.fb.group({
			items: this.fb.array([]),
		});

		this.budgetForm
			.get('items')
			?.valueChanges.pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
			.subscribe(() => {
				this.recalculateAllSubtotals();
			});

		this.loadExistingItems();
	}

	loadProjectDetails() {
		this.projectService
			.getProjectById(this.projectId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (data) => {
					this.project = data;
					if (
						data.generalExpensesPercentage !== undefined &&
						data.generalExpensesPercentage !== null
					) {
						this.generalExpensesPercentage = data.generalExpensesPercentage;
					}
					if (data.utilityPercentage !== undefined && data.utilityPercentage !== null) {
						this.utilityPercentage = data.utilityPercentage;
					}
					if (this.isLocked) {
						this.itemsFormArray.controls.forEach((row) => {
							row.get('unit')?.disable();
						});
					}
					this.recalculateTotals();
					this.cdr.markForCheck();
				},
			});
	}

	get isLocked(): boolean {
		return (this.project?.currentProgress ?? 0) > 0;
	}

	get itemsFormArray() {
		return this.budgetForm.get('items') as FormArray;
	}

	loadExistingItems() {
		this.isLoading = true;
		this.cdr.markForCheck();
		this.itemService
			.getItems(this.projectId)
			.pipe(
				finalize(() => {
					this.isLoading = false;
					this.cdr.markForCheck();
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (data) => {
					if (data.length > 0) {
						const formGroups = data.map((item) => this.crearFila(item));
						this.budgetForm.setControl('items', this.fb.array(formGroups));
					} else {
						this.itemsFormArray.clear();
					}

					this.recalculateWBS();
					this.ensureEmptyRows();
					this.recalculateAllSubtotals();
				},
				error: () => {},
			});
	}

	recalculateAllSubtotals() {
		const rows = this.itemsFormArray.getRawValue();
		const levelSubtotals: number[] = new Array(15).fill(0); // Soportar hasta 15 niveles de profundidad

		for (let i = rows.length - 1; i >= 0; i--) {
			const currentRow = rows[i];
			const control = this.itemsFormArray.at(i);

			const currentLevel = Number(currentRow.level) || 0;
			const nextLevel = i < rows.length - 1 ? Number(rows[i + 1].level) || 0 : -1;
			const isParent = nextLevel > currentLevel;

			if (!isParent) {
				const sub = (Number(currentRow.totalQuantity) || 0) * (Number(currentRow.unitPrice) || 0);
				control.get('subtotal')?.setValue(sub, { emitEvent: false });
				levelSubtotals[currentLevel] += sub;
			} else {
				let sumChildren = 0;
				for (let l = currentLevel + 1; l < levelSubtotals.length; l++) {
					sumChildren += levelSubtotals[l];
					levelSubtotals[l] = 0; // Limpiar los acumulados porque ya subieron de nivel
				}
				control.get('subtotal')?.setValue(sumChildren, { emitEvent: false });
				levelSubtotals[currentLevel] += sumChildren; // Empujar la suma al nivel actual
			}
		}

		this.recalculateTotals();
	}

	recalculateTotals() {
		const rows = this.itemsFormArray.getRawValue();
		const validRows = rows.filter(
			(item: { description?: string; level?: number }) =>
				item.description?.trim() !== '' || Number(item.level) > 0,
		);

		let minLevel = 0;
		if (validRows.length > 0) {
			minLevel = Math.min(...validRows.map((row: { level?: number }) => Number(row.level) || 0));
		}

		this.directCost = rows
			.filter((item: { level?: number; subtotal?: number }) => Number(item.level) === minLevel)
			.reduce((sum: number, item: { subtotal?: number }) => sum + (Number(item.subtotal) || 0), 0);

		this.generalExpenses = this.directCost * ((this.generalExpensesPercentage || 0) / 100);
		this.utility = this.directCost * ((this.utilityPercentage || 0) / 100);
		this.subtotal = this.directCost + this.generalExpenses + this.utility;
		this.igv = this.subtotal * 0.18;
		this.grandTotal = this.subtotal + this.igv;
		this.cdr.markForCheck();
	}

	private crearFila(item?: Partial<ProjectItemDto>): FormGroup {
		return this.fb.group({
			id: [item?.id || null],
			code: [{ value: item?.code || '', disabled: true }],
			level: [item?.level || 0],
			description: [item?.description || ''],
			unit: [{ value: item?.unit || '', disabled: this.isLocked }],
			totalQuantity: [item?.totalQuantity || null],
			unitPrice: [item?.unitPrice || null],
			executedQuantity: [{ value: item?.executedQuantity || 0, disabled: true }],
			laborYield: [item?.laborYield || 0],
			equipmentYield: [item?.equipmentYield || 0],
			apuDetails: [item?.apuDetails || []],
			subtotal: [{ value: 0, disabled: true }],
		});
	}

	addRow(item?: Partial<ProjectItemDto>) {
		this.itemsFormArray.push(this.crearFila(item));
	}

	toggleApuView(index: number) {
		const row = this.itemsFormArray.at(index);
		const apuDetails = row.get('apuDetails')?.value;

		if (!apuDetails || apuDetails.length === 0) {
			this.toastService.show('Esta partida aún no tiene recursos en su APU.', 'warning');
			return;
		}

		// Si estaba abierto, lo cierra. Si estaba cerrado, lo abre.
		this.expandedRows[index] = !this.expandedRows[index];
	}

	isCellActive(rowIdx: number, col: CellColumn): boolean {
		return !this.isLocked && this.activeCell?.rowIdx === rowIdx && this.activeCell?.col === col;
	}

	activateCell(rowIdx: number, col: CellColumn) {
		if (this.isLocked) return;
		if (rowIdx < 0 || rowIdx >= this.itemsFormArray.length) return;
		if (this.isParent(rowIdx) && col !== 'description') return;

		if (this.blurTimeout) {
			clearTimeout(this.blurTimeout);
			this.blurTimeout = null;
		}

		if (this.isCellActive(rowIdx, col)) return;

		this.activeCell = { rowIdx, col };
		this.cdr.markForCheck();

		setTimeout(() => {
			const el = document.getElementById(`cell-${col}-${rowIdx}`);
			if (el) {
				el.focus();
				if (el instanceof HTMLInputElement && el.type === 'text') {
					el.select();
				}
			}
		}, 0);
	}

	deactivateCell(rowIdx: number, col: CellColumn) {
		if (this.activeCell?.rowIdx !== rowIdx || this.activeCell?.col !== col) {
			return;
		}
		this.blurTimeout = setTimeout(() => {
			if (this.activeCell?.rowIdx === rowIdx && this.activeCell?.col === col) {
				this.activeCell = null;
				this.ensureEmptyRows();
				this.recalculateAllSubtotals();
				this.cdr.markForCheck();
			}
		}, 150);
	}

	removeRow(index: number) {
		if (this.activeCell) {
			if (this.activeCell.rowIdx === index) {
				this.activeCell = null;
			} else if (this.activeCell.rowIdx > index) {
				this.activeCell.rowIdx -= 1;
			}
		}

		this.itemsFormArray.removeAt(index);

		// Al eliminar, los índices de las filas debajo se desplazan -1.
		// Necesitamos ajustar expandedRows para mantener la consistencia.
		const newExpandedRows: { [key: number]: boolean } = {};
		for (const key of Object.keys(this.expandedRows)) {
			const numKey = Number(key);
			if (numKey < index) {
				newExpandedRows[numKey] = this.expandedRows[numKey];
			} else if (numKey > index) {
				newExpandedRows[numKey - 1] = this.expandedRows[numKey];
			}
		}
		this.expandedRows = newExpandedRows;

		this.recalculateWBS();
		this.ensureEmptyRows();
	}

	insertRow(index: number) {
		this.itemsFormArray.insert(index + 1, this.crearFila());

		// Al insertar, los índices de las filas debajo se desplazan +1.
		const newExpandedRows: { [key: number]: boolean } = {};
		for (const key of Object.keys(this.expandedRows)) {
			const numKey = Number(key);
			if (numKey <= index) {
				newExpandedRows[numKey] = this.expandedRows[numKey];
			} else {
				newExpandedRows[numKey + 1] = this.expandedRows[numKey];
			}
		}
		this.expandedRows = newExpandedRows;

		// Heredar la misma sangría de la fila desde donde se inserta
		const prevRowLevel = this.itemsFormArray.at(index).get('level')?.value || 0;
		this.itemsFormArray
			.at(index + 1)
			.get('level')
			?.setValue(prevRowLevel);

		this.recalculateWBS();

		this.activateCell(index + 1, 'description');
	}

	ensureEmptyRows() {
		const controls = this.itemsFormArray.controls;
		let emptyCount = 0;

		for (let i = controls.length - 1; i >= 0; i--) {
			if (!controls[i].get('description')?.value) {
				emptyCount++;
			} else {
				break;
			}
		}

		// Si hay menos de 5 filas vacías, agregamos las que falten
		const rowsToAdd = this.MIN_EMPTY_ROWS - emptyCount;
		for (let i = 0; i < rowsToAdd; i++) {
			this.addRow();
		}

		this.recalculateWBS();
	}

	handleCellKeydown(event: KeyboardEvent, rowIdx: number, col: CellColumn) {
		if (event.key === 'Escape') {
			event.preventDefault();
			if (this.blurTimeout) {
				clearTimeout(this.blurTimeout);
				this.blurTimeout = null;
			}
			this.activeCell = null;
			this.ensureEmptyRows();
			this.recalculateAllSubtotals();
			this.cdr.markForCheck();
			return;
		}

		if (
			(col === 'totalQuantity' || col === 'unitPrice') &&
			(event.key === '-' || event.key === 'e')
		) {
			event.preventDefault();
			return;
		}

		if (col === 'description') {
			// Tecla TAB: Sangría a la derecha
			if (event.key === 'Tab' && !event.shiftKey) {
				event.preventDefault();
				this.changeIndent(rowIdx, 1);
				return;
			}
			// Teclas SHIFT + TAB: Quitar Sangría (Izquierda)
			if (event.key === 'Tab' && event.shiftKey) {
				event.preventDefault();
				this.changeIndent(rowIdx, -1);
				return;
			}
			// Tecla ENTER: Baja a la siguiente fila
			if (event.key === 'Enter') {
				event.preventDefault();
				this.activateCell(rowIdx + 1, 'description');
				return;
			}
		} else {
			// Para otras columnas: TAB navega horizontalmente
			if (event.key === 'Tab') {
				event.preventDefault();
				if (!event.shiftKey) {
					if (col === 'unit') {
						this.activateCell(rowIdx, 'totalQuantity');
					} else if (col === 'totalQuantity') {
						this.activateCell(rowIdx, 'unitPrice');
					} else if (col === 'unitPrice') {
						this.activateCell(rowIdx + 1, 'description');
					}
				} else {
					if (col === 'unitPrice') {
						this.activateCell(rowIdx, 'totalQuantity');
					} else if (col === 'totalQuantity') {
						this.activateCell(rowIdx, 'unit');
					} else if (col === 'unit') {
						this.activateCell(rowIdx, 'description');
					}
				}
				return;
			}

			// Tecla ENTER: Baja a la siguiente fila en la misma columna
			if (event.key === 'Enter') {
				event.preventDefault();
				let nextRow = rowIdx + 1;
				while (nextRow < this.itemsFormArray.length && this.isParent(nextRow)) {
					nextRow++;
				}
				if (nextRow < this.itemsFormArray.length) {
					this.activateCell(nextRow, col);
				} else {
					this.activateCell(rowIdx + 1, 'description');
				}
				return;
			}
		}
	}

	handleKeydown(event: KeyboardEvent, index: number) {
		this.handleCellKeydown(event, index, 'description');
	}

	changeIndent(index: number, delta: number) {
		const row = this.itemsFormArray.at(index);
		const currentLevel = row.get('level')?.value;
		let newLevel = currentLevel + delta;

		if (newLevel < 0) newLevel = 0;

		row.get('level')?.setValue(newLevel);
		this.recalculateWBS();
	}

	recalculateWBS() {
		const counters = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // Aumentado para soportar más sangrías

		let lastValidIndex = -1;
		for (let i = this.itemsFormArray.length - 1; i >= 0; i--) {
			const row = this.itemsFormArray.at(i);
			const desc = row.get('description')?.value || '';
			const level = Number(row.get('level')?.value || 0);

			if (desc.trim() !== '' || level > 0) {
				lastValidIndex = i;
				break;
			}
		}

		// 1. Detectar dinámicamente si el nivel raíz empieza en 0 (Angular) o en 1 (BD)
		let minLevel = 0;
		if (lastValidIndex >= 0) {
			minLevel = Math.min(
				...this.itemsFormArray.controls
					.slice(0, lastValidIndex + 1)
					.map((row) => Number(row.get('level')?.value || 0)),
			);
		}

		for (let i = 0; i < this.itemsFormArray.length; i++) {
			const row = this.itemsFormArray.at(i);

			if (i > lastValidIndex) {
				row.get('code')?.setValue('', { emitEvent: false });
				continue;
			}

			const level = Number(row.get('level')?.value || 0);
			counters[level]++;

			// Limpiar los subniveles para que la numeración hija reinicie
			for (let j = level + 1; j < counters.length; j++) {
				counters[j] = 0;
			}

			// 2. Generar el código WBS cortando estrictamente desde el nivel mínimo detectado
			const generatedCode = counters.slice(minLevel, level + 1).join('.');

			row.get('code')?.setValue(generatedCode, { emitEvent: false });
		}
	}

	isParent(index: number): boolean {
		const rows = this.itemsFormArray.controls;
		if (index >= rows.length - 1) return false;

		const currentLevel = rows[index].get('level')?.value;
		const nextLevel = rows[index + 1].get('level')?.value;

		return nextLevel > currentLevel;
	}

	// Calcula el subtotal de una fila (ya sea hijo o padre)
	getRowSubtotal(index: number): number {
		const rows = this.itemsFormArray.getRawValue();
		const currentRow = rows[index];

		// Si NO es padre (es una partida de último nivel), cálculo simple
		if (!this.isParent(index)) {
			return (currentRow.totalQuantity || 0) * (currentRow.unitPrice || 0);
		}

		// SI ES PADRE: Lógica de Roll-up (Suma de sus hijos)
		let total = 0;
		const parentLevel = currentRow.level;

		// Recorremos las filas siguientes
		for (let i = index + 1; i < rows.length; i++) {
			const nextRow = rows[i];

			// Si encontramos una fila con nivel igual o menor, paramos (ya no es su hijo)
			if (nextRow.level <= parentLevel) break;

			// Solo sumamos el subtotal de las filas que son "hojas" (no son padres)
			if (!this.isParent(i)) {
				total += (nextRow.totalQuantity || 0) * (nextRow.unitPrice || 0);
			}
		}
		return total;
	}

	saveBudget() {
		if (this.blurTimeout) {
			clearTimeout(this.blurTimeout);
			this.blurTimeout = null;
		}
		this.activeCell = null;

		if (this.isLocked) {
			this.toastService.show(
				'No se puede modificar el presupuesto de una obra en ejecución.',
				'error',
			);
			return;
		}

		if (this.generalExpensesPercentage < 0 || this.utilityPercentage < 0) {
			this.toastService.show(
				'Los porcentajes de gastos generales y utilidad no pueden ser negativos.',
				'warning',
			);
			return;
		}

		const rawData = this.itemsFormArray.getRawValue();

		for (let i = 0; i < rawData.length; i++) {
			const item = rawData[i];
			if (!item.description || item.description.trim() === '') continue;

			if (!this.isParent(i)) {
				if (!item.unit || item.unit === '') {
					this.toastService.show(
						`Error en la fila ${i + 1} (Código ${item.code}):\nFalta la Unidad.`,
						'warning',
					);
					return;
				}
				if (!item.totalQuantity || item.totalQuantity <= 0) {
					this.toastService.show(
						`Error en la fila ${i + 1} (Código ${item.code}):\nFalta el Metrado.`,
						'warning',
					);
					return;
				}
				if (!item.unitPrice || item.unitPrice <= 0) {
					this.toastService.show(
						`Error en la fila ${i + 1} (Código ${item.code}):\nFalta el Precio Unitario.`,
						'warning',
					);
					return;
				}
			}
		}

		const payload: ProjectItemDto[] = rawData
			.filter((item) => item.description && item.description.trim() !== '')
			.map((item, index) => {
				const formattedItem = {
					...item,
					itemOrder: index,
					totalQuantity: Number(item.totalQuantity),
					unitPrice: Number(item.unitPrice),
					level: Number(item.level),
					laborYield: Number(item.laborYield || 0),
					equipmentYield: Number(item.equipmentYield || 0),
				};

				if (this.isParent(index)) {
					return {
						...formattedItem,
						unit: null,
						totalQuantity: null,
						unitPrice: null,
						laborYield: 0,
						equipmentYield: 0,
					};
				}
				return formattedItem;
			});

		if (payload.length === 0) {
			this.toastService.show('No hay datos válidos para guardar.', 'warning');
			return;
		}

		this.isLoading = true;
		this.cdr.markForCheck();

		const request: BudgetSaveRequestDto = {
			generalExpensesPercentage: this.generalExpensesPercentage,
			utilityPercentage: this.utilityPercentage,
			items: payload,
		};

		// --- 3. ENVÍO AL BACKEND ---
		this.itemService
			.saveBulkItems(this.projectId, request)
			.pipe(
				finalize(() => {
					this.isLoading = false;
					this.cdr.markForCheck();
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: () => {
					this.toastService.show('Presupuesto guardado con éxito.', 'success');
					this.loadExistingItems();
				},
				error: (err: HttpErrorResponse) =>
					this.toastService.showApiError(err, 'Error de conexión al guardar el presupuesto.'),
			});
	}

	// Al abrir el modal, cargamos los detalles que ya existían
	openApuModal(index: number) {
		const row = this.itemsFormArray.at(index);
		if (!row.get('id')?.value) {
			this.toastService.show('Primero debe "Guardar Presupuesto".', 'warning');
			return;
		}

		this.selectedItemIndex = index;
		// Extraemos la fila entera para enviársela al hijo
		this.selectedItemData = row.getRawValue();
		this.isApuModalOpen = true;
	}

	isDownloadingPdf = false;

	exportToPdf() {
		if (!this.projectId || this.isDownloadingPdf) return;
		this.isDownloadingPdf = true;
		this.cdr.markForCheck();

		this.projectService
			.downloadApuReport(this.projectId)
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
					const a = document.createElement('a');
					a.href = url;
					a.download = `reporte_presupuesto_proyecto_${this.project?.name || this.projectId}.pdf`;
					document.body.appendChild(a);
					a.click();
					document.body.removeChild(a);
					window.URL.revokeObjectURL(url);
				},
				error: (_err: HttpErrorResponse) => {
					this.toastService.show('Error al descargar el PDF', 'error');
				},
			});
	}

	handleApuSaved(_updatedItem: ProjectItemDto) {
		this.isApuModalOpen = false;
		this.selectedItemData = null;

		this.loadExistingItems();

		this.toastService.show('Vista de presupuesto actualizada.', 'success');
	}

	getApuGroup(
		apuDetails: ProjectItemResourceResponseDto[],
		type: string,
	): ProjectItemResourceResponseDto[] {
		if (!apuDetails) return [];
		return apuDetails.filter((apu) => apu.resourceType === type);
	}

	getApuGroupTotal(apuDetails: ProjectItemResourceResponseDto[], type: string): number {
		const group = this.getApuGroup(apuDetails, type);
		return group.reduce((sum, item) => sum + (item.partialPrice || 0), 0);
	}
}
