import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { UserDto } from '../../core/models/user.model';
import { ConfirmModal } from "../../shared/components/confirm-modal/confirm-modal";
import { UserFormModalComponent } from "./user-form-modal/user-form-modal";
import { Skeleton } from '../../shared/components/skeleton/skeleton';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';

@Component({
  selector: 'app-gestion-usuarios',
  imports: [CommonModule, FormsModule, ConfirmModal, UserFormModalComponent, Skeleton, HasPermissionDirective],
  templateUrl: './gestion-usuarios.html',
  styleUrl: './gestion-usuarios.css',
})
export class GestionUsuariosComponent implements OnInit {
  private userService = inject(UserService);

  // Datos
  users: UserDto[] = [];
  
  // Paginación y Filtros
  currentPage = 0;
  pageSize = 5;
  totalElements = 0;
  totalPages = 0;
  searchTerm = '';
  selectedRole = 'ALL';
  activeFilter = '';

  // UI States
  isLoading = false;
  activeMenuId: number | null = null;
  isModalOpen = false;
  modalMode: 'create' | 'edit' | 'view' = 'create';
  selectedUser: UserDto | null = null;

  // Variables para el modal de eliminación
  isDeleteModalOpen = false;
  userToDelete: UserDto | null = null;
  isDeleting = false;

  // Variables para el modal de reactivación
  isReactivateModalOpen = false;
  userToReactivate: UserDto | null = null;
  isReactivating = false;

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading = true;
    this.userService.getUsers(this.currentPage, this.pageSize, this.searchTerm, this.selectedRole, this.activeFilter)
      .subscribe({
        next: (response) => {
          this.users = response.content;
          this.totalElements = response.totalElements;
          this.totalPages = response.totalPages;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error al cargar usuarios', err);
          this.isLoading = false;
        }
      });
  }

  onSearchChange() {
    this.currentPage = 0;
    this.loadUsers();
  }

  onFilterChange() {
    this.currentPage = 0;
    this.loadUsers();
  }

  // Métodos de navegación
  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadUsers();
    }
  }

  previousPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadUsers();
    }
  }

  toggleMenu(userId: number, event: Event) {
    event.stopPropagation();
    this.activeMenuId = this.activeMenuId === userId ? null : userId;
  }

  getInitials(name: string, lastName: string): string {
    const first = name ? name.charAt(0) : '?';
    const last = lastName ? lastName.charAt(0) : '?';
    return (first + last).toUpperCase();
  }

  openModal(mode: 'create' | 'edit' | 'view', user: UserDto | null = null) {
    this.isModalOpen = false;
    this.selectedUser = null; 

    setTimeout(() => {
      this.modalMode = mode;
      this.selectedUser = user ? { ...user } : null;
      this.isModalOpen = true;
    }, 10);
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedUser = null;
  }

  // Lógica para la eliminación (Confirmación)
  openDeleteConfirm(user: UserDto) {
    this.userToDelete = user;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.userToDelete = null;
  }

  confirmDelete() {
    if (!this.userToDelete) return;
    
    this.isDeleting = true;
    this.userService.deleteUser(this.userToDelete.id).subscribe({
      next: () => {
        this.isDeleting = false;
        this.closeDeleteModal();
        this.loadUsers();
      },
      error: (err) => {
        console.error('Error al eliminar:', err);
        this.isDeleting = false;
      }
    });
  }

  // Lógica para la reactivación
  openReactivateConfirm(user: UserDto) {
    this.userToReactivate = user;
    this.isReactivateModalOpen = true;
  }

  closeReactivateModal() {
    this.isReactivateModalOpen = false;
    this.userToReactivate = null;
  }

  confirmReactivate() {
    if (!this.userToReactivate) return;
    
    this.isReactivating = true;
    this.userService.reactivateUser(this.userToReactivate.id).subscribe({
      next: () => {
        this.isReactivating = false;
        this.closeReactivateModal();
        this.loadUsers();
      },
      error: (err) => {
        console.error('Error al reactivar:', err);
        this.isReactivating = false;
      }
    });
  }

  onUserSaved() {
    this.loadUsers();
  }
}
