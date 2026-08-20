import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { ProjectItemService } from '../../../../core/services/project-item.service';
import { ProgressReportRequestDto, ProjectItemDto, ProjectResponseDto } from '../../../../core/models/project.model';
import { ProgressReportService } from '../../../../core/services/progress-report.service';
import { ProjectService } from '../../../../core/services/project.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ToastService } from '../../../../core/services/toast-service';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { InventoryService } from '../../../../core/services/inventory.service';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-daily-report-component',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, Skeleton, DatePickerModule, SelectModule],
  templateUrl: './daily-report-component.html',
  styleUrl: './daily-report-component.css',
})
export class DailyReportComponent implements OnInit {

  projectId!: number;
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);
  private reportService = inject(ProgressReportService);
  private itemService = inject(ProjectItemService);
  private projectService = inject(ProjectService);
  private inventoryService = inject(InventoryService);
  private route = inject(ActivatedRoute);

  reportForm!: FormGroup;
  executableItems: ProjectItemDto[] = [];
  selectedItemInfo: ProjectItemDto | null = null;
  project: ProjectResponseDto | null = null;

  selectedFiles: File[] = [];
  previewUrls: string[] = [];
  isLoading = false;

  get projectItemOptions() {
    return this.executableItems.map(item => ({
      label: `${item.code} · ${item.description} (${item.unit})`,
      value: item.id
    }));
  }

  get projectStartMinDate(): Date | undefined {
    if (!this.project?.startDate) return undefined;
    const [year, month, day] = this.project.startDate.split('-').map(Number);
    return year && month && day ? new Date(year, month - 1, day) : undefined;
  }

  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('id'));
    const today = new Date().toISOString().split('T')[0];

    this.reportForm = this.fb.group({
      projectItemId: ['', Validators.required],
      reportDate: [today, Validators.required],
      executedQuantity: ['', [Validators.required, Validators.min(0.01)]],
      observations: [''],
      usedResources: this.fb.array([])
    });

    this.loadProjectItems();
    this.loadProjectDetails();

    this.reportForm.get('projectItemId')?.valueChanges.subscribe(id => {
      this.selectedItemInfo = this.executableItems.find(i => i.id === Number(id)) || null;
      this.reportForm.get('executedQuantity')?.reset();
      this.buildResourcesForm();
    });

    this.reportForm.get('executedQuantity')?.valueChanges.subscribe(metradoHoy => {
      this.recalculateTheoretical(Number(metradoHoy) || 0);
    });

    this.reportForm.get('reportDate')?.valueChanges.subscribe(date => {
      if (this.selectedItemInfo) {
        this.updateMaterialQuantities(date);
      }
    });
  }


  get usedResourcesFormArray() {
    return this.reportForm.get('usedResources') as FormArray;
  }

  buildResourcesForm() {
    this.usedResourcesFormArray.clear();

    if (!this.selectedItemInfo || !this.selectedItemInfo.apuDetails) return;

    this.selectedItemInfo.apuDetails.forEach(apu => {
      const isMaterial = apu.resourceType === 'MATERIAL';
      const rowGroup = this.fb.group({
        resourceId: [apu.resourceId],
        resourceName: [apu.resourceName],
        resourceType: [apu.resourceType],
        resourceUnit: [apu.resourceUnit],

        unitCoefficient: [apu.quantity],

        theoreticalQuantity: [{ value: 0, disabled: true }], // Solo lectura
        realQuantity: [{ value: 0, disabled: isMaterial }, [Validators.required, Validators.min(0)]] // El ingeniero digita esto si no es material
      });

      this.usedResourcesFormArray.push(rowGroup);

      // Si es material, traemos la cantidad automáticamente desde el almacén
      if (isMaterial && this.selectedItemInfo?.id) {
        const reportDate = this.reportForm.get('reportDate')?.value;
        this.inventoryService.getConsumedQuantity(Number(this.selectedItemInfo?.id), Number(apu.resourceId), reportDate).subscribe({
          next: (qty) => {
            rowGroup.get('realQuantity')?.setValue(qty || 0);
          },
          error: (err) => {
            console.error('Error fetching consumed quantity', err);
          }
        });
      }
    });
  }

  updateMaterialQuantities(date: string) {
    this.usedResourcesFormArray.controls.forEach(rowGroup => {
      if (rowGroup.get('resourceType')?.value === 'MATERIAL') {
        this.inventoryService.getConsumedQuantity(Number(this.selectedItemInfo?.id), Number(rowGroup.get('resourceId')?.value), date).subscribe({
          next: (qty) => {
            rowGroup.get('realQuantity')?.setValue(qty || 0);
          },
          error: (err) => {
            console.error('Error fetching consumed quantity', err);
          }
        });
      }
    });
  }

  recalculateTheoretical(metradoHoy: number) {
    this.usedResourcesFormArray.controls.forEach(row => {
      const coeff = row.get('unitCoefficient')?.value || 0;
      const theoretical = Number((coeff * metradoHoy).toFixed(2));

      row.get('theoreticalQuantity')?.setValue(theoretical);

      // Solo copiamos el teórico al real si NO es material (los materiales vienen de almacén)
      if (row.get('resourceType')?.value !== 'MATERIAL') {
        row.get('realQuantity')?.setValue(theoretical);
      }
    });
  }

  getResourceControls(type: string) {
    return this.usedResourcesFormArray.controls.filter(
      control => control.get('resourceType')?.value === type
    );
  }

  loadProjectDetails() {
    this.projectService.getProjectById(this.projectId).subscribe({
      next: (data) => this.project = data
    });
  }

  loadProjectItems() {
    this.itemService.getItems(this.projectId).subscribe({
      next: (data) => {
        this.executableItems = data.filter(item => item.totalQuantity !== null && item.totalQuantity > 0 && item.apuDetails && item.apuDetails.length > 0);
      }
    });
  }

  get isCompleted(): boolean {
    return this.project?.status === 'COMPLETED' || this.project?.currentProgress === 100;
  }

  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        this.selectedFiles.push(file);
        const reader = new FileReader();
        reader.onload = (e: any) => this.previewUrls.push(e.target.result);
        reader.readAsDataURL(file);
      }
    }
  }

  removePhoto(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.previewUrls.splice(index, 1);
  }

  onSubmit(): void {
    if (this.reportForm.invalid || !this.selectedItemInfo) {
      this.toastService.show('Complete todos los campos obligatorios.', 'warning');
      return;
    }


    const dto: ProgressReportRequestDto = this.reportForm.getRawValue();
    const maxAllowed = this.selectedItemInfo.totalQuantity - (this.selectedItemInfo.executedQuantity || 0);

    if (dto.executedQuantity > maxAllowed) {
      this.toastService.show(`El metrado reportado excede el saldo disponible (${maxAllowed} ${this.selectedItemInfo.unit}).`, `warning`);
      return;
    }

    this.isLoading = true;
    this.reportService.createReport(dto, this.selectedFiles).subscribe({
      next: () => {
        this.toastService.show(`Reporte Diario enviado con éxito.`, `success`);
        this.reportForm.reset({ reportDate: dto.reportDate });
        this.usedResourcesFormArray.clear();
        this.selectedFiles = [];
        this.previewUrls = [];
        this.selectedItemInfo = null;
        this.isLoading = false;
        this.loadProjectItems();
        this.loadProjectDetails();
      },
      error: (err) => {
        this.toastService.showApiError(err, 'Error de conexión al enviar el reporte.');
        this.isLoading = false;
      }
    });
  }
}
