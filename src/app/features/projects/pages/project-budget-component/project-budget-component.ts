import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { ProjectItemService } from '../../../../core/services/project-item.service';
import { ProjectItemDto, ProjectResponseDto } from '../../../../core/models/project.model';
import { ToastService } from '../../../../core/services/toast-service';
import { ProjectService } from '../../../../core/services/project.service';


@Component({
  selector: 'app-project-budget',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './project-budget-component.html',
  styleUrls: ['./project-budget-component.css']
})
export class ProjectBudgetComponent implements OnInit {
  @Input({ required: true }) projectId!: number;

  private fb = inject(FormBuilder);
  private itemService = inject(ProjectItemService);
  private toastService = inject(ToastService);
  private projectService = inject(ProjectService)
  project: ProjectResponseDto | null = null;
  budgetForm!: FormGroup;
  isLoading = false;
  
  private readonly MIN_EMPTY_ROWS = 5;

  ngOnInit() {
    this.loadProjectDetails();
    this.budgetForm = this.fb.group({
      items: this.fb.array([])
    });
    this.loadExistingItems();
  }

  loadProjectDetails() {
    this.projectService.getProjectById(this.projectId).subscribe({
      next: (data) => this.project = data
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
        this.itemsFormArray.clear();

        if (data.length > 0) {
          data.forEach(item => this.addRow(item));
        }
        
        this.recalculateWBS();
        this.ensureEmptyRows(); 
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  addRow(item?: any) {
    const row = this.fb.group({
      code: [{ value: item?.code || '', disabled: true }],
      level: [item?.level || 0],
      description: [item?.description || ''], // Quitamos el Validator.required temporalmente para las filas fantasma
      unit: [item?.unit || ''],
      totalQuantity: [item?.totalQuantity || null],
      unitPrice: [item?.unitPrice || null],
      executedQuantity: [{ value: item?.executedQuantity || 0, disabled: true }]
    });
    this.itemsFormArray.push(row);
  }

  removeRow(index: number) {
    this.itemsFormArray.removeAt(index);
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
        // CORRECCIÓN: padStart necesita el '0' para que no ponga un espacio en blanco
        generatedCode = generatedCode.padStart(2); 
      }

      row.get('code')?.setValue(generatedCode, { emitEvent: false });
    }
  }

  // --- 3. SANITIZACIÓN AL GUARDAR ---
  isParent(index: number): boolean {
    const rows = this.itemsFormArray.controls;
    if (index >= rows.length - 1) return false;

    const currentLevel = rows[index].get('level')?.value;
    const nextLevel = rows[index + 1].get('level')?.value;

    // Es padre si el siguiente elemento tiene un nivel de sangría mayor
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
    
    // --- 1. VALIDACIÓN ESPECÍFICA DE NEGOCIO ---
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

    // --- 2. PREPARACIÓN DEL PAYLOAD ---
    const payload: ProjectItemDto[] = rawData
      .filter(item => item.description && item.description.trim() !== '')
      .map((item, index) => {
        const formattedItem = {
          ...item,
          totalQuantity: Number(item.totalQuantity),
          unitPrice: Number(item.unitPrice),
          level: Number(item.level)
        };

        if (this.isParent(index)) {
          return { ...formattedItem, unit: null, totalQuantity: null, unitPrice: null };
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
}