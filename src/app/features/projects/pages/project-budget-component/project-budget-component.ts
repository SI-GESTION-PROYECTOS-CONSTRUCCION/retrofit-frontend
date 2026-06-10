import { Component, Input, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ProjectItemService } from '../../../../core/services/project-item.service';
import { ProjectItemDto, ProjectResponseDto } from '../../../../core/models/project.model';
import { ToastService } from '../../../../core/services/toast-service';
import { ProjectService } from '../../../../core/services/project.service';
import { ApuModalComponent } from '../../modal/apu-modal-component/apu-modal-component';
import { debounceTime } from 'rxjs';
import { Resizable } from '../../../../core/directives/resizable';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';


@Component({
  selector: 'app-project-budget',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ApuModalComponent, Resizable, HasPermissionDirective],
  templateUrl: './project-budget-component.html',
  styleUrls: ['./project-budget-component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectBudgetComponent implements OnInit {
  @Input({ required: true }) projectId!: number;

  private fb = inject(FormBuilder);
  private itemService = inject(ProjectItemService);
  private toastService = inject(ToastService);
  private projectService = inject(ProjectService);
  private cdr = inject(ChangeDetectorRef);
  project: ProjectResponseDto | null = null;
  budgetForm!: FormGroup;
  isLoading = false;

  private readonly MIN_EMPTY_ROWS = 5;
  isApuModalOpen = false;
  selectedItemIndex: number | null = null;
  selectedItemData: any = null;
  expandedRows: { [key: number]: boolean } = {};

  ngOnInit() {
    this.loadProjectDetails();
    this.budgetForm = this.fb.group({
      items: this.fb.array([])
    });


    this.budgetForm.get('items')?.valueChanges.pipe(
      debounceTime(300)
    ).subscribe(() => {
      this.recalculateAllSubtotals();
    });

    this.loadExistingItems();
  }

  loadProjectDetails() {
    this.projectService.getProjectById(this.projectId).subscribe({
      next: (data) => {
        this.project = data;
        if (this.isLocked) {
          this.itemsFormArray.controls.forEach(row => {
            row.get('unit')?.disable();
          });
        }
        this.cdr.markForCheck();
      }
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
    this.itemService.getItems(this.projectId).subscribe({
      next: (data) => {

        if (data.length > 0) {
          const formGroups = data.map(item => this.crearFila(item));
          this.budgetForm.setControl('items', this.fb.array(formGroups));
        } else {
          this.itemsFormArray.clear();
        }

        this.recalculateWBS();
        this.ensureEmptyRows();
        this.recalculateAllSubtotals();

        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }


  recalculateAllSubtotals() {
    const rows = this.itemsFormArray.getRawValue();
    const levelSubtotals: number[] = new Array(15).fill(0); // Soportar hasta 15 niveles de profundidad

    for (let i = rows.length - 1; i >= 0; i--) {
      const currentRow = rows[i];
      const control = this.itemsFormArray.at(i);

      const currentLevel = Number(currentRow.level) || 0;
      const nextLevel = (i < rows.length - 1) ? (Number(rows[i + 1].level) || 0) : -1;
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
    
    this.cdr.markForCheck(); // Notificar a Angular que hay cambios para la tabla OnPush
  }

  private crearFila(item?: any): FormGroup {
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
      subtotal: [{ value: 0, disabled: true }]
    });
  }


  addRow(item?: any) {
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

  removeRow(index: number) {
    this.itemsFormArray.removeAt(index);
    delete this.expandedRows[index];
    this.recalculateWBS();
    this.ensureEmptyRows();
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


  handleKeydown(event: KeyboardEvent, index: number) {
    // Tecla TAB: Sangría a la derecha
    if (event.key === 'Tab' && !event.shiftKey) {
      event.preventDefault(); // Evita que salte de input
      this.changeIndent(index, 1);
    }
    // Teclas SHIFT + TAB: Quitar Sangría (Izquierda)
    else if (event.key === 'Tab' && event.shiftKey) {
      event.preventDefault();
      this.changeIndent(index, -1);
    }
    // Tecla ENTER: Baja a la siguiente fila
    else if (event.key === 'Enter') {
      event.preventDefault();
      const nextInput = document.getElementById(`desc-${index + 1}`);
      if (nextInput) {
        nextInput.focus();
      }
    }
  }

  changeIndent(index: number, delta: number) {
    const row = this.itemsFormArray.at(index);
    let currentLevel = row.get('level')?.value;
    let newLevel = currentLevel + delta;

    if (newLevel < 0) newLevel = 0;

    row.get('level')?.setValue(newLevel);
    this.recalculateWBS();
  }

  recalculateWBS() {
    let counters = [0, 0, 0, 0, 0, 0, 0];

    let lastValidIndex = -1;
    for (let i = this.itemsFormArray.length - 1; i >= 0; i--) {
      const row = this.itemsFormArray.at(i);
      const desc = row.get('description')?.value || '';
      // FORZAMOS A QUE SEA NÚMERO PARA EVITAR ERRORES MATEMÁTICOS
      const level = Number(row.get('level')?.value || 0);

      if (desc.trim() !== '' || level > 0) {
        lastValidIndex = i;
        break;
      }
    }

    for (let i = 0; i < this.itemsFormArray.length; i++) {
      const row = this.itemsFormArray.at(i);

      if (i > lastValidIndex) {
        row.get('code')?.setValue('', { emitEvent: false });
        continue;
      }

      // FORZAMOS A QUE SEA NÚMERO
      const level = Number(row.get('level')?.value || 0);
      counters[level]++;

      for (let j = level + 1; j < counters.length; j++) {
        counters[j] = 0;
      }

      let generatedCode = counters.slice(0, level + 1).join('.');

      if (level === 0) {

        generatedCode = generatedCode.padStart(2);
      }

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

  // Modificamos el guardado para "limpiar" los datos de los padres antes de enviar
  saveBudget() {

    if (this.isLocked) {
      this.toastService.show('No se puede modificar el presupuesto de una obra en ejecución.', 'error');
      return;
    }

    const rawData = this.itemsFormArray.getRawValue();


    for (let i = 0; i < rawData.length; i++) {
      const item = rawData[i];
      if (!item.description || item.description.trim() === '') continue;

      if (!this.isParent(i)) {
        if (!item.unit || item.unit === '') {
          this.toastService.show(`Error en la fila ${i + 1} (Código ${item.code}):\nFalta la Unidad.`, 'warning');
          return;
        }
        if (!item.totalQuantity || item.totalQuantity <= 0) {
          this.toastService.show(`Error en la fila ${i + 1} (Código ${item.code}):\nFalta el Metrado.`, 'warning');
          return;
        }
        if (!item.unitPrice || item.unitPrice <= 0) {
          this.toastService.show(`Error en la fila ${i + 1} (Código ${item.code}):\nFalta el Precio Unitario.`, 'warning');
          return;
        }
      }
    }

    const payload: ProjectItemDto[] = rawData
      .filter(item => item.description && item.description.trim() !== '')
      .map((item, index) => {
        const formattedItem = {
          ...item,
          itemOrder: index,
          totalQuantity: Number(item.totalQuantity),
          unitPrice: Number(item.unitPrice),
          level: Number(item.level),
          laborYield: Number(item.laborYield || 0),
          equipmentYield: Number(item.equipmentYield || 0)
        };

        if (this.isParent(index)) {
          return { ...formattedItem, unit: null, totalQuantity: null, unitPrice: null, laborYield: 0, equipmentYield: 0 };
        }
        return formattedItem;
      });

    if (payload.length === 0) {
      this.toastService.show("No hay datos válidos para guardar.", 'warning');
      return;
    }

    // --- 3. ENVÍO AL BACKEND ---
    this.itemService.saveBulkItems(this.projectId, payload).subscribe({
      next: () => {
        this.toastService.show('Presupuesto guardado con éxito.', 'success');
        this.loadExistingItems();
      },
      error: () => this.toastService.show('Error de conexión al guardar el presupuesto.', 'error')
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
    if (!this.projectId) return;
    this.isDownloadingPdf = true;
    this.projectService.downloadApuReport(this.projectId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_presupuesto_proyecto_${this.project?.name}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.isDownloadingPdf = false;
      },
      error: (err) => {
        console.error('Error al descargar el PDF:', err);
        this.isDownloadingPdf = false;
      }
    });
  }

  handleApuSaved(updatedItem: ProjectItemDto) {
    this.isApuModalOpen = false;
    this.selectedItemData = null;

    this.loadExistingItems();

    this.toastService.show('Vista de presupuesto actualizada.', 'success');
  }

  getApuGroup(apuDetails: any[], type: string): any[] {
    if (!apuDetails) return [];
    return apuDetails.filter(apu => apu.resourceType === type);
  }

  getApuGroupTotal(apuDetails: any[], type: string): number {
    const group = this.getApuGroup(apuDetails, type);
    return group.reduce((sum, item) => sum + (item.partialPrice || 0), 0);
  }

}