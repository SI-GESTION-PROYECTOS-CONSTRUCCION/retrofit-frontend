import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { InventoryService } from '../../../../core/services/inventory.service';
import { ResourceService } from '../../../../core/services/resource.service';
import { ProjectItemService } from '../../../../core/services/project-item.service';
import { StockSummary, TransactionReason } from '../../../../core/models/inventory.model';
import { ToastService } from '../../../../core/services/toast-service';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'app-project-inventory',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, HasPermissionDirective, NgSelectModule],
  templateUrl: './project-inventory-component.html',
  styleUrls: ['./project-inventory-component.css']
})
export class ProjectInventoryComponent implements OnInit {
  @Input({ required: true }) projectId!: number;

  private fb = inject(FormBuilder);
  private inventoryService = inject(InventoryService);
  private projectItemService = inject(ProjectItemService);
  private toastService = inject(ToastService);
  isLoading = false;
  isDownloadingPdf = false;
  showInboundModal = false;
  showOutboundModal = false;

  inboundForm!: FormGroup;
  outboundForm!: FormGroup;


  resources: any[] = []; 
  projectItems: any[] = []; 
  filteredProjectItems: any[] = [];

  inventoryData: StockSummary[] = [];

  showKardexModal = false;
  kardexData: any[] = [];
  selectedResourceName = '';
  searchTerm = '';

  currentPage = 1;
  itemsPerPage = 10;
  totalElements = 0;
  totalPages = 0;

  get startIndex(): number {
    if (this.totalElements === 0) return 0;
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  get endIndex(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalElements);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadInventory();
    }
  }

  onSearchChange(event: any): void {
    this.searchTerm = event.target.value;
    this.currentPage = 1;
    this.loadInventory();
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadInventory();
    }
  }

  ngOnInit(): void {
    this.initForms();
    this.loadInventory();
    this.loadDropdownData(); 
  }

  private initForms(): void {
    this.inboundForm = this.fb.group({
      resourceId: ['', Validators.required],
      reason: [TransactionReason.PURCHASE, Validators.required],
      quantity: [null, [Validators.required, Validators.min(0.01)]],
      referenceDocument: [''],
      observations: ['']
    });

    this.outboundForm = this.fb.group({
      resourceId: ['', Validators.required],
      projectItemId: [{value: '', disabled: true}, Validators.required],
      reason: [TransactionReason.CONSUMPTION, Validators.required],
      quantity: [null, [Validators.required, Validators.min(0.01)]],
      referenceDocument: [''],
      observations: ['']
    });

    this.outboundForm.get('resourceId')?.valueChanges.subscribe((resourceId) => {
      const projectItemControl = this.outboundForm.get('projectItemId');
      if (resourceId) {
        this.filteredProjectItems = this.projectItems.filter(item => 
          item.apuDetails && item.apuDetails.some((apu: any) => apu.resourceId === resourceId)
        );
        projectItemControl?.enable();
      } else {
        this.filteredProjectItems = [];
        projectItemControl?.disable();
      }
      projectItemControl?.setValue('');
    });
  }

  loadInventory(): void {
    this.isLoading = true;
    this.inventoryService.getProjectStockSummary(this.projectId, this.searchTerm, this.currentPage - 1, this.itemsPerPage).subscribe({
      next: (pageData: any) => {
        if (Array.isArray(pageData)) {
          this.inventoryData = pageData;
          this.totalElements = pageData.length;
          this.totalPages = Math.ceil(pageData.length / this.itemsPerPage);
        } else {
          this.inventoryData = pageData.content || [];
          this.totalElements = pageData.totalElements || 0;
          this.totalPages = pageData.totalPages || 0;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error al cargar el inventario:', err);
        this.inventoryData = [];
        this.totalElements = 0;
        this.totalPages = 0;
        this.isLoading = false;
      }
    });
  }

  private loadDropdownData(): void {
    this.inventoryService.getPlannedMaterials(this.projectId).subscribe({
      next: (data) => {
        this.resources = data; 
      },
      error: (err) => console.error('Error cargando materiales planificados', err)
    });

    
    this.projectItemService.getItems(this.projectId).subscribe({
      next: (data) => {
        this.projectItems = data.filter(item => item.unit && item.unit.trim() !== '');
      },
      error: (err) => console.error('Error cargando partidas', err)
    });
  }

  openInboundModal() {
    this.inboundForm.reset({ reason: TransactionReason.PURCHASE });
    this.showInboundModal = true;
  }

  openOutboundModal(resourceId?: number) {
    this.outboundForm.reset({ reason: TransactionReason.CONSUMPTION, resourceId: resourceId || '' });
    this.showOutboundModal = true;
  }

  openKardexModal(resourceId: number, resourceName: string) {
    this.selectedResourceName = resourceName;
    this.isLoading = true;
    
    this.inventoryService.getKardex(this.projectId, resourceId).subscribe({
      next: (data) => {
        this.kardexData = data;
        this.showKardexModal = true;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando kardex', err);
        this.isLoading = false;
      }
    });
  }

  closeModals() {
    this.showInboundModal = false;
    this.showOutboundModal = false;
    this.showKardexModal = false; 
  }

  submitInbound() {
    if (this.inboundForm.invalid) return;
    const request = {
      ...this.inboundForm.value,
      projectId: this.projectId
    };
    
    this.inventoryService.registerInbound(request).subscribe({
      next: () => {
        this.closeModals();
        this.loadInventory();
      },
      error: (err: any) => {
        this.toastService.showApiError(err, 'Error al guardar la transacción');
      }
    });
  }

  submitOutbound() {
    if (this.outboundForm.invalid) return;
    const request = {
      ...this.outboundForm.value,
      projectId: this.projectId
    };

    this.inventoryService.registerOutbound(request).subscribe({
      next: () => {
        this.closeModals();
        this.loadInventory();
      },
      error: (err: any) => {
        this.toastService.showApiError(err, 'Error al guardar la transacción');
      }
    });
  }

  generateReport(type: 'pdf' | 'excel') {
    this.isDownloadingPdf = true;
    this.toastService.show('Generando reporte...', 'success');
    this.inventoryService.downloadInventoryReport(this.projectId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Reporte_Inventario_Proyecto_${this.projectId}.${type === 'pdf' ? 'pdf' : 'xlsx'}`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.isDownloadingPdf = false;
      },
      error: (err: any) => {
        this.toastService.showApiError(err, 'Error al generar el reporte');
        this.isDownloadingPdf = false;
      }
    });
  }
}