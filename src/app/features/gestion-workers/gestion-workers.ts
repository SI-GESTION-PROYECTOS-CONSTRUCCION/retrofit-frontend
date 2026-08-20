import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkerFormModalComponent } from './worker-form-modal/worker-form-modal';
import { WorkerService } from '../../core/services/worker.service';
import { WorkerDto } from '../../core/models/worker.model';
import { ConfirmModal } from '../../shared/components/confirm-modal/confirm-modal';
import { Skeleton } from '../../shared/components/skeleton/skeleton';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-gestion-workers',
  imports: [CommonModule, FormsModule, WorkerFormModalComponent, ConfirmModal, Skeleton, HasPermissionDirective, SelectModule],
  templateUrl: './gestion-workers.html',
  styleUrl: './gestion-workers.css',
})
export class GestionWorkersComponent implements OnInit {
  private workerService = inject(WorkerService);

  // --- Datos ---
  workers: WorkerDto[] = [];
  
  // --- Paginación y Filtros ---
  currentPage = 0;
  pageSize = 5;
  totalElements = 0;
  totalPages = 0;
  searchTerm = '';
  activeFilter = '';
  readonly statusOptions = [
    { label: 'Todos los estados', value: '' },
    { label: 'Solo activos', value: 'true' },
    { label: 'Solo inactivos', value: 'false' }
  ];

  // --- UI States ---
  isLoading = false;
  isModalOpen = false;
  modalMode: 'create' | 'edit' | 'view' = 'create';
  selectedWorker: WorkerDto | null = null;

  // --- Modal de Eliminación ---
  isDeleteModalOpen = false;
  workerToDelete: WorkerDto | null = null;
  isDeleting = false;

  ngOnInit() {
    this.loadWorkers();
  }

  loadWorkers() {
    this.isLoading = true;
    this.workerService.getWorkers(this.currentPage, this.pageSize, this.searchTerm, this.activeFilter)
      .subscribe({
        next: (response) => {
          this.workers = response.content;
          this.totalElements = response.totalElements;
          this.totalPages = response.totalPages;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error al cargar trabajadores', err);
          this.isLoading = false;
        }
      });
  }

  // --- Filtros ---
  onSearchChange() {
    this.currentPage = 0;
    this.loadWorkers();
  }

  // --- Navegación ---
  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadWorkers();
    }
  }

  previousPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadWorkers();
    }
  }

  // --- Gestión de Modales ---
  openModal(mode: 'create' | 'edit' | 'view', worker: WorkerDto | null = null) {
    this.isModalOpen = false;
    this.selectedWorker = null; 

    setTimeout(() => {
      this.modalMode = mode;
      this.selectedWorker = worker ? { ...worker } : null;
      this.isModalOpen = true;
    }, 10); 
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedWorker = null;
  }

  onWorkerSaved() {
    this.loadWorkers();
  }

  // --- Eliminación (Confirmación) ---
  openDeleteConfirm(worker: WorkerDto) {
    this.workerToDelete = worker;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.workerToDelete = null;
  }

  confirmDelete() {
    if (!this.workerToDelete) return;
    
    this.isDeleting = true;
    this.workerService.deleteWorker(this.workerToDelete.id).subscribe({
      next: () => {
        this.isDeleting = false;
        this.closeDeleteModal();
        this.loadWorkers();
      },
      error: (err) => {
        console.error('Error al eliminar trabajador:', err);
        this.isDeleting = false;
      }
    });
  }

  // --- Helpers UI ---
  getInitials(name: string, lastName: string): string {
    const first = (name && name.length > 0) ? name.charAt(0) : '?';
    const last = (lastName && lastName.length > 0) ? lastName.charAt(0) : '?';
    return (first + last).toUpperCase();
  }
}
