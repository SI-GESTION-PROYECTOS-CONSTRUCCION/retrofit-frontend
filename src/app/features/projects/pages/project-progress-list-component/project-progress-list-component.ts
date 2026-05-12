import { Component, inject, Input } from '@angular/core';
import { ProgressReportService } from '../../../../core/services/progress-report.service';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-project-progress-list-component',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './project-progress-list-component.html',
  styleUrl: './project-progress-list-component.css',
})
export class ProjectProgressListComponent {
  @Input({ required: true }) projectId!: number;
  
  private reportService = inject(ProgressReportService);
  private fb = inject(FormBuilder);

  groupedReports: any[] = [];
  isLoading = true;
  filterForm!: FormGroup;
  
  openPeriods: Set<string> = new Set();

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
        
        // Abrir automáticamente el primer mes (el más reciente) por defecto
        if (this.groupedReports.length > 0) {
          this.openPeriods.add(this.groupedReports[0].period);
        }
      },
      error: () => this.isLoading = false
    });
  }

  // --- MÉTODOS DEL ACORDEÓN ---
  togglePeriod(period: string) {
    if (this.openPeriods.has(period)) {
      this.openPeriods.delete(period); // Cierra
    } else {
      this.openPeriods.add(period); // Abre
    }
  }

  isPeriodOpen(period: string): boolean {
    return this.openPeriods.has(period);
  }

  // --- MÉTODOS DE BÚSQUEDA ---
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
}
