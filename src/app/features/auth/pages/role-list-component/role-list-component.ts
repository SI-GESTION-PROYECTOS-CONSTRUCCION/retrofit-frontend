import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastService } from '../../../../core/services/toast-service';
import { RoleService } from '../../../../core/services/role.service';
import { CommonModule } from '@angular/common';
import { ConfirmModal } from '../../../../shared/components/confirm-modal/confirm-modal';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';

@Component({
  selector: 'app-role-list-component',
  imports: [CommonModule, ReactiveFormsModule, ConfirmModal, Skeleton],
  templateUrl: './role-list-component.html',
  styleUrl: './role-list-component.css',
})
export class RoleListComponent {
  private roleService = inject(RoleService);
  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);

  roles: any[] = [];
  isLoading = false;

  // --- LÓGICA DE LA MATRIZ DE PERMISOS ---
  allPermissions: any[] = [];
  permissionMap: { [key: string]: number } = {}; // Ej: { 'PROJECT_CREATE': 1, 'PROJECT_READ': 2 }
  selectedPermissionIds = new Set<number>(); 
  modules: { prefix: string, label: string }[] = [];
  actions: string[] = [];
  
  labelMap: Record<string, string> = {
    'PROJECT': 'Proyectos y APUs',
    'RESOURCE': 'Catálogo de Recursos',
    'REPORT': 'Reportes de Avance',
    'WORKER': 'Trabajadores y Asignaciones',
    'USER': 'Usuarios del Sistema',
    'SECURITY': 'Roles y Seguridad',
    'INVENTORY': 'Inventario (Almacén)',
    'AUDIT': 'Auditoría'
  };

  // --- MODALES ---
  isModalOpen = false;
  roleForm!: FormGroup;
  editingId: number | null = null;

  isDeleteModalOpen = false;
  roleToDelete: any = null;
  isDeleting = false;

  ngOnInit() {
    this.initForm();
    this.loadPermissions(); // Cargamos el diccionario primero
    this.loadRoles();
  }

  initForm() {
    this.roleForm = this.fb.group({
      name: ['', Validators.required],
      description: ['']
    });
  }

  loadPermissions() {
    this.roleService.getAllPermissions().subscribe({
      next: (res: any[]) => {
        this.allPermissions = res;
        this.permissionMap = {};
        res.forEach(p => {
          this.permissionMap[p.name] = p.id;
        });
        this.buildDynamicMatrix(res);
      },
      error: (err) => {
        this.toastService.show('Error al cargar diccionario de permisos', 'error');
      }
    });
  }

  buildDynamicMatrix(perms: any[]) {
    const prefixSet = new Set<string>();
    const actionSet = new Set<string>();

    perms.forEach(p => {
      const parts = p.name.split('_');
      if (parts.length >= 2) {
        const action = parts.pop();
        const prefix = parts.join('_');
        if (prefix) prefixSet.add(prefix);
        if (action) actionSet.add(action);
      } else {
        prefixSet.add(p.name);
        actionSet.add('ACCESS');
      }
    });

    const standardActions = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT'];
    this.actions = Array.from(actionSet).sort((a, b) => {
      const idxA = standardActions.indexOf(a);
      const idxB = standardActions.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    this.modules = Array.from(prefixSet).map(prefix => ({
      prefix,
      label: this.labelMap[prefix] || prefix
    }));
  }

  isPermissionApplicable(prefix: string, action: string): boolean {
    return this.permissionMap[`${prefix}_${action}`] !== undefined;
  }

  loadRoles() {
    this.isLoading = true;
    this.roleService.getAllRoles().subscribe({
      next: (data) => {
        this.roles = data;
        this.isLoading = false;
      },
      error: () => {
        this.toastService.show('Error al cargar los roles', 'error');
        this.isLoading = false;
      }
    });
  }

  // --- FUNCIONES DEL CHECKBOX (LA MAGIA) ---
  
  // Verifica si un permiso (ej. 'PROJECT_CREATE') está en los seleccionados
  hasPermission(prefix: string, action: string): boolean {
    const permName = `${prefix}_${action}`;
    const permId = this.permissionMap[permName];
    return permId ? this.selectedPermissionIds.has(permId) : false;
  }

  // Se activa al hacer clic en un checkbox
  togglePermission(prefix: string, action: string) {
    const permName = `${prefix}_${action}`;
    const permId = this.permissionMap[permName];
    
    if (!permId) return; // Si por alguna razón el permiso no existe en la BD

    if (this.selectedPermissionIds.has(permId)) {
      this.selectedPermissionIds.delete(permId);
    } else {
      this.selectedPermissionIds.add(permId);
    }
  }


  // --- MODAL CREAR / EDITAR ---
  openModal(role?: any) {
    this.isModalOpen = true;
    this.selectedPermissionIds.clear(); // Limpiamos la matriz

    if (role) {
      this.editingId = role.id;
      this.roleForm.patchValue({
        name: role.name,
        description: role.description
      });
      // Marcamos los checkboxes que ya tiene este rol
      role.permissions.forEach((p: any) => this.selectedPermissionIds.add(p.id));
    } else {
      this.editingId = null;
      this.roleForm.reset();
    }
  }

  closeModal() {
    this.isModalOpen = false;
    this.editingId = null;
    this.roleForm.reset();
  }

  saveRole() {
    if (this.roleForm.invalid) return;

    // Empaquetamos la data como la espera el backend
    const dataToSend = {
      name: this.roleForm.value.name.toUpperCase(),
      description: this.roleForm.value.description,
      permissionIds: Array.from(this.selectedPermissionIds) // Convertimos el Set a Array
    };

    const request$ = this.editingId
      ? this.roleService.updateRole(this.editingId, dataToSend)
      : this.roleService.createRole(dataToSend);

    request$.subscribe({
      next: () => {
        this.toastService.show('Rol guardado correctamente', 'success');
        this.closeModal();
        this.loadRoles();
      },
      error: (err) => {
        this.toastService.show(err.error?.message || 'Error al guardar', 'error');
      }
    });
  }

  // --- ELIMINAR ---
  openDeleteModal(role: any) {
    this.roleToDelete = role;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.roleToDelete = null;
    this.isDeleting = false;
  }

  confirmDelete() {
    if (!this.roleToDelete) return;
    this.isDeleting = true;

    this.roleService.deleteRole(this.roleToDelete.id).subscribe({
      next: () => {
        this.toastService.show('Rol eliminado con éxito', 'success');
        this.closeDeleteModal();
        this.loadRoles();
      },
      error: (err) => {
        this.toastService.show(err.error?.message || 'Error al eliminar', 'error');
        this.closeDeleteModal();
      }
    });
  }
}
