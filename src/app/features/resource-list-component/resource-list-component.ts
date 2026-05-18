import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { ResourceService } from '../../core/services/resource.service';
import { ToastService } from '../../core/services/toast-service';
import { ConfirmModal } from '../../shared/components/confirm-modal/confirm-modal';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';

@Component({
  selector: 'app-resource-list-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ConfirmModal, HasPermissionDirective],
  templateUrl: './resource-list-component.html',
  styleUrl: './resource-list-component.css',
})
export class ResourceListComponent implements OnInit {
  private catalogService = inject(ResourceService);
  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);

  tabs = [
    { type: 'MATERIAL', apiPath: 'materials', label: 'Materiales', icon: 'fa-box', defaultUnit: 'und' },
    { type: 'LABOR', apiPath: 'labor-categories', label: 'Mano de Obra', icon: 'fa-hard-hat', defaultUnit: 'hh' },
    { type: 'EQUIPMENT', apiPath: 'equipment', label: 'Maquinaria y Equipos', icon: 'fa-truck-pickup', defaultUnit: 'hm' }
  ];
  activeTab = this.tabs[0]; 

  resources: any[] = []; 
  isLoading = false;
  
  searchTerm: string = '';
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  totalElements: number = 0;
  
  private searchSubject = new Subject<string>();

  isModalOpen = false;
  resourceForm!: FormGroup;
  editingId: number | null = null;

  isDeleteModalOpen = false;
  resourceToDelete: any = null;
  isDeleting = false;

  ngOnInit() {
    this.initForm();
    this.loadData();

    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(() => {
      this.currentPage = 1;
      this.loadData();
    });
  }

  initForm() {
    this.resourceForm = this.fb.group({
      name: ['', Validators.required],
      unit: ['', Validators.required],
      basePrice: [0, [Validators.required, Validators.min(0)]]
    });
  }

  switchTab(tab: any) {
    if (this.activeTab.type !== tab.type) {
      this.activeTab = tab;
      this.searchTerm = ''; 
      this.currentPage = 1;
      this.loadData();
    }
  }

  onSearchChange() {
    this.searchSubject.next(this.searchTerm);
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadData();
    }
  }

  get pagesArray(): number[] {
    return Array(this.totalPages).fill(0).map((x, i) => i + 1);
  }

  loadData() {
    this.isLoading = true;
    this.catalogService.getResourcesPaginated(this.currentPage, this.pageSize, this.searchTerm, this.activeTab.type).subscribe({
      next: (response) => {
        this.resources = response.content;
        this.totalPages = response.totalPages;
        this.totalElements = response.totalElements;
        this.isLoading = false;
      },
      error: () => {
        this.toastService.show('Error al cargar recursos', 'error');
        this.isLoading = false;
      }
    });
  }

  openModal(resource?: any) {
    this.isModalOpen = true;
    if (resource) {
      this.editingId = resource.resourceId; 
      this.resourceForm.patchValue({
        name: resource.resourceName,
        unit: resource.resourceUnit,
        basePrice: resource.resourceBasePrice
      });
    } else {
      this.editingId = null;
      this.resourceForm.reset({ 
        unit: this.activeTab.defaultUnit, 
        basePrice: 0 
      });
    }
  }

  closeModal() {
    this.isModalOpen = false;
    this.editingId = null;
    this.resourceForm.reset();
  }

  private getApiPath(type: string): string {
    const tab = this.tabs.find(t => t.type === type);
    return tab ? tab.apiPath : 'materials';
  }

  saveResource() {
    if (this.resourceForm.invalid) return;

    const dataToSend = this.resourceForm.value;
    
    const apiPath = this.activeTab.apiPath;

    const request$ = this.editingId 
      ? this.catalogService.updateResource(apiPath, this.editingId, dataToSend)
      : this.catalogService.createResource(apiPath, dataToSend);

    request$.subscribe({
      next: () => {
        this.toastService.show('Recurso guardado correctamente', 'success');
        this.closeModal();
        this.loadData();
      },
      error: (err) => {
        this.toastService.show('Error al guardar el recurso', 'error');
        console.error(err);
      }
    });
  }

  openDeleteModal(resource: any) {
    this.resourceToDelete = resource;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.resourceToDelete = null;
    this.isDeleting = false;
  }

  confirmDelete() {
    if (!this.resourceToDelete) return;
    this.isDeleting = true;
    
    const apiPath = this.getApiPath(this.resourceToDelete.resourceType);

    this.catalogService.deleteResource(apiPath, this.resourceToDelete.resourceId).subscribe({
      next: () => {
        this.toastService.show('Recurso eliminado', 'success');
        this.closeDeleteModal();
        if (this.resources.length === 1 && this.currentPage > 1) {
          this.currentPage--;
        }
        this.loadData();
      },
      error: () => {
        this.toastService.show('No se puede eliminar, el recurso está en uso', 'error');
        this.closeDeleteModal();
      }
    });
  }
}