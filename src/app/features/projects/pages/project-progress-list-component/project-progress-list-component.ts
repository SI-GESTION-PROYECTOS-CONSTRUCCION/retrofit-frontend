import { Component, inject, Input, OnInit } from '@angular/core';
import { ProgressReportService } from '../../../../core/services/progress-report.service';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';

@Component({
  selector: 'app-project-progress-list-component',
  imports: [CommonModule, ReactiveFormsModule, Skeleton],
  templateUrl: './project-progress-list-component.html',
  styleUrl: './project-progress-list-component.css',
})
export class ProjectProgressListComponent implements OnInit {
  @Input({ required: true }) projectId!: number;
  
  private reportService = inject(ProgressReportService);
  private fb = inject(FormBuilder);

  groupedReports: any[] = [];
  isLoading = true;
  isDownloadingPdf = false;
  filterForm!: FormGroup;
  
  openPeriods: Set<string> = new Set();
  
  openedResources: { [reportId: number]: boolean } = {};

  ngOnInit() {
    this.filterForm = this.fb.group({
      startDate: [''],
      endDate: [''],
      itemCode: ['']
    });

    this.loadHistory();
  }

  loadHistory() {
    this.isLoading = true;
    const filters = this.filterForm.value;

    this.reportService.getReportsByProject(this.projectId, filters).subscribe({
      next: (data) => {
        this.groupedReports = data;
        this.isLoading = false;
        
        if (this.groupedReports.length > 0) {
          this.openPeriods.add(this.groupedReports[0].period);
        }
      },
      error: () => this.isLoading = false
    });
  }

  togglePeriod(period: string) {
    if (this.openPeriods.has(period)) {
      this.openPeriods.delete(period); 
    } else {
      this.openPeriods.add(period); 
    }
  }

  isPeriodOpen(period: string): boolean {
    return this.openPeriods.has(period);
  }

  toggleResources(reportId: number) {
    this.openedResources[reportId] = !this.openedResources[reportId];
  }

  isResourcesOpen(reportId: number): boolean {
    return !!this.openedResources[reportId];
  }

  getResourceGroup(resources: any[], type: string): any[] {
    if (!resources) return [];
    return resources.filter(r => r.resourceType === type);
  }

  applyFilters() {
    this.loadHistory();
  }

  clearFilters() {
    this.filterForm.reset();
    this.loadHistory();
  }

  openPhoto(url: string) {
    window.open(url, '_blank');
  }

  printReport() {
    this.isDownloadingPdf = true;
    const filters = this.filterForm.value;
    this.reportService.downloadProgressReport(this.projectId, filters).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_avances_proyecto_${this.projectId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        this.isDownloadingPdf = false;
      },
      error: (err) => {
        console.error('Error descargando el reporte', err);
        alert('Hubo un error al generar el reporte.');
        this.isDownloadingPdf = false;
      }
    });
  }
}