import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { InventoryService } from '../../../../core/services/inventory.service';
import { ResourceService } from '../../../../core/services/resource.service';
import { ProjectItemService } from '../../../../core/services/project-item.service';
import { StockSummary, TransactionReason } from '../../../../core/models/inventory.model';
import { ToastService } from '../../../../core/services/toast-service';

@Component({
  selector: 'app-project-inventory',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
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
  showInboundModal = false;
  showOutboundModal = false;

  inboundForm!: FormGroup;
  outboundForm!: FormGroup;


  resources: any[] = []; 
  projectItems: any[] = []; 

  inventoryData: StockSummary[] = [];

  showKardexModal = false;
  kardexData: any[] = [];
  selectedResourceName = '';

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
      projectItemId: ['', Validators.required],
      reason: [TransactionReason.CONSUMPTION, Validators.required],
      quantity: [null, [Validators.required, Validators.min(0.01)]],
      referenceDocument: [''],
      observations: ['']
    });
  }

  loadInventory(): void {
    this.isLoading = true;
    this.inventoryService.getProjectStockSummary(this.projectId).subscribe({
      next: (data) => {
        this.inventoryData = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error al cargar el inventario:', err);
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
      projectId: this.projectId,
      createdBy: 'fcastro'
    };
    
    this.inventoryService.registerInbound(request).subscribe({
      next: () => {
        this.closeModals();
        this.loadInventory();
      },
      error: (err) => console.error(err)
    });
  }

  submitOutbound() {
    if (this.outboundForm.invalid) return;
    const request = {
      ...this.outboundForm.value,
      projectId: this.projectId,
      createdBy: 'admin'
    };

    this.inventoryService.registerOutbound(request).subscribe({
      next: () => {
        this.closeModals();
        this.loadInventory();
      },
      error: (err) => {
        console.error(err);
        this.toastService.show(err.error.message, 'error')
      }
    });
  }
}