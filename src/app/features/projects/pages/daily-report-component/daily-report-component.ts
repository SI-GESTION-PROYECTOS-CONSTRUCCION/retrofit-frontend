import { Component, OnInit, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ProjectItemService } from '../../../../core/services/project-item.service';
import { ProgressReportRequestDto, ProjectItemDto, ProjectResponseDto } from '../../../../core/models/project.model';
import { ProgressReportService } from '../../../../core/services/progress-report.service';
import { ProjectService } from '../../../../core/services/project.service';
import { ActivatedRoute } from '@angular/router';
import { ToastService } from '../../../../core/services/toast-service';

@Component({
  selector: 'app-daily-report-component',
  imports: [CommonModule, ReactiveFormsModule],
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
  // 3. INYECTAMOS EL SERVICIO DE RUTAS
  private route = inject(ActivatedRoute);

  reportForm!: FormGroup;
  executableItems: ProjectItemDto[] = [];
  selectedItemInfo: ProjectItemDto | null = null;
  
  // 3. VARIABLE PARA ALMACENAR EL PROYECTO
  project: ProjectResponseDto | null = null;

  selectedFiles: File[] = [];
  previewUrls: string[] = [];
  isLoading = false;

  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('id'));

    const today = new Date().toISOString().split('T')[0];

    this.reportForm = this.fb.group({
      projectItemId: ['', Validators.required],
      reportDate: [today, Validators.required],
      executedQuantity: ['', [Validators.required, Validators.min(0.1)]],
      observations: ['']
    });

    this.loadProjectItems();
    this.loadProjectDetails(); 

    this.reportForm.get('projectItemId')?.valueChanges.subscribe(id => {
      this.selectedItemInfo = this.executableItems.find(i => i.id === Number(id)) || null;
      this.reportForm.get('executedQuantity')?.reset();
    });
  }

  loadProjectDetails() {
    this.projectService.getProjectById(this.projectId).subscribe({
      next: (data) => this.project = data,
      error: (err) => console.error('Error al cargar datos del proyecto', err)
    });
  }

  loadProjectItems() {
    this.itemService.getItems(this.projectId).subscribe({
      next: (data) => {
        this.executableItems = data.filter(item => item.totalQuantity !== null && item.totalQuantity > 0);
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
    if (this.reportForm.invalid || !this.selectedItemInfo) return;

    const dto: ProgressReportRequestDto = this.reportForm.value;
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
        this.selectedFiles = [];
        this.previewUrls = [];
        this.selectedItemInfo = null;
        this.isLoading = false;
        this.loadProjectItems();
      },
      error: (err) => {
        const errorMsg = err.error?.message || err.error || 'Error de conexión al enviar el reporte.';
        this.toastService.show(`❌ ${errorMsg}`, `error`);
        this.isLoading = false;
      }
    });
  }
}
