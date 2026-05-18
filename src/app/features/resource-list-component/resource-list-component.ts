import { Component, inject } from '@angular/core';
import { ResourceService } from '../../core/services/resource.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ResourceResponseDto } from '../../core/models/resource.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-resource-list-component',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './resource-list-component.html',
  styleUrl: './resource-list-component.css',
})
export class ResourceListComponent {
  private catalogService = inject(ResourceService);
  private fb = inject(FormBuilder);

  // Control de Pestañas
  tabs = [
    { id: 'materials', label: 'Materiales', icon: 'fa-box', defaultUnit: 'und' },
    { id: 'labor-categories', label: 'Mano de Obra', icon: 'fa-hard-hat', defaultUnit: 'hh' },
    { id: 'equipment', label: 'Maquinaria y Equipos', icon: 'fa-truck-pickup', defaultUnit: 'hm' }
  ];
  activeTab = this.tabs[0];

  resources: ResourceResponseDto[] = [];
  isLoading = false;

  // Modal y Formulario
  isModalOpen = false;
  resourceForm!: FormGroup;
  editingId: number | null = null;

  ngOnInit() {
    this.initForm();
    this.loadData();
  }

  initForm() {
    this.resourceForm = this.fb.group({
      name: ['', Validators.required],
      unit: ['', Validators.required],
      basePrice: [0, [Validators.required, Validators.min(0)]]
    });
  }

  switchTab(tab: any) {
    this.activeTab = tab;
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    this.catalogService.getResources(this.activeTab.id).subscribe({
      next: (data) => {
        this.resources = data;
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  // --- MÉTODOS DEL MODAL ---
  openModal(resource?: ResourceResponseDto) {
    this.isModalOpen = true;
    if (resource) {
      this.editingId = resource.id;
      this.resourceForm.patchValue(resource);
    } else {
      this.editingId = null;
      this.resourceForm.reset({ unit: this.activeTab.defaultUnit, basePrice: 0 });
    }
  }

  closeModal() {
    this.isModalOpen = false;
    this.editingId = null;
    this.resourceForm.reset();
  }

  saveResource() {
    if (this.resourceForm.invalid) return;

    const data = this.resourceForm.value;
    const request$ = this.editingId 
      ? this.catalogService.updateResource(this.activeTab.id, this.editingId, data)
      : this.catalogService.createResource(this.activeTab.id, data);

    request$.subscribe({
      next: () => {
        this.closeModal();
        this.loadData();
      },
      error: (err) => console.error('Error guardando recurso', err)
    });
  }

  deleteResource(id: number) {
    if (confirm('¿Estás seguro de eliminar este recurso?')) {
      this.catalogService.deleteResource(this.activeTab.id, id).subscribe({
        next: () => this.loadData(),
        error: (err) => console.error('Error eliminando', err)
      });
    }
  }
}
