import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ProjectService } from '../../../../core/services/project.service';
import { UserService } from '../../../../core/services/user.service';
import { UserDto } from '../../../../core/models/user.model';
import { ProjectResponseDto } from '../../../../core/models/project.model';
import { ToastService } from '../../../../core/services/toast-service';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'app-project-create-modal-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, DatePickerModule, InputTextModule, SelectModule, TextareaModule],
  templateUrl: './project-create-modal-component.html',
  styleUrl: './project-create-modal-component.css',
})
export class ProjectCreateModalComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() projectSaved = new EventEmitter<void>();
  @Input() projectToEdit: ProjectResponseDto | null = null;
  private fb = inject(FormBuilder);
  private projectService = inject(ProjectService);
  private userService = inject(UserService);
  private toastService = inject(ToastService);

  projectForm: FormGroup;
  isSubmitting = false;
  managers: UserDto[] = [];
  readonly statusOptions = [
    { label: 'Planeamiento', value: 'PLANNING' },
    { label: 'En ejecución', value: 'IN_PROGRESS' },
    { label: 'Pausado', value: 'ON_HOLD' },
    { label: 'Completado', value: 'COMPLETED' },
    { label: 'Cancelado', value: 'CANCELLED' }
  ];
  readonly priorityOptions = [
    { label: 'Baja', value: 'LOW' },
    { label: 'Media', value: 'MEDIUM' },
    { label: 'Alta', value: 'HIGH' },
    { label: 'Crítica', value: 'CRITICAL' }
  ];
  // Los paneles se montan fuera del contenedor con scroll del modal.
  readonly modalOverlayOptions = { autoZIndex: true, baseZIndex: 1301 };
  
  backendErrors: { [key: string]: string } = {};

  constructor() {
    this.projectForm = this.fb.group({
      code: ['', Validators.required],
      name: ['', [Validators.required, Validators.pattern('^(?=.*[a-zA-ZñÑáéíóúÁÉÍÓÚ])[a-zA-ZñÑáéíóúÁÉÍÓÚ0-9 ]+$')]],
      client: ['', [Validators.required, Validators.pattern('^(?=.*[a-zA-ZñÑáéíóúÁÉÍÓÚ])[a-zA-ZñÑáéíóúÁÉÍÓÚ0-9 ]+$')]],
      location: ['', [Validators.pattern('^$|^(?=.*[a-zA-ZñÑáéíóúÁÉÍÓÚ])[a-zA-ZñÑáéíóúÁÉÍÓÚ0-9 ]+$')]],
      description: [''],
      startDate: ['', Validators.required],
      status: ['PLANNING', Validators.required], 
      priority: ['MEDIUM', Validators.required],
      managerId: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadManagers();

    if (this.projectToEdit) {
      this.projectForm.patchValue({
        code: this.projectToEdit.code,
        name: this.projectToEdit.name,
        client: this.projectToEdit.client,
        location: this.projectToEdit.location,
        description: this.projectToEdit.description,
        startDate: this.projectToEdit.startDate,
        status: this.projectToEdit.status,
        priority: this.projectToEdit.priority
        // managerId lo setearemos después de cargar la lista de managers
      });
    }
  }

  loadManagers() {
    this.userService.getUsers(0, 10, '','ALL', 'true').subscribe({
      next: (response) => {

        this.managers = response.content;
        
        if (this.projectToEdit && this.projectToEdit.managerId) {
          this.projectForm.patchValue({
            managerId: this.projectToEdit.managerId
          });
        }
      },
      error: (err) => console.error('Error al cargar responsables', err)
    });
  }

  get managerOptions() {
    return this.managers.map(manager => ({
      label: `${manager.name} ${manager.lastName}`,
      value: manager.id
    }));
  }

  onSubmit() {
    this.backendErrors = {};
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const rawData = this.projectForm.value;
    const requestDto: any = Object.fromEntries(
      Object.entries(rawData).map(([key, value]) => 
        [key, typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value]
      )
    );

    const request$ = this.projectToEdit 
      ? this.projectService.updateProject(this.projectToEdit.id, requestDto)
      : this.projectService.createProject(requestDto);

    request$.subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.projectSaved.emit();
        this.closeModal();
      },
      error: (err) => {
        this.isSubmitting = false;
        if (err.status === 400 && err.error && Object.keys(err.error).length > 0) {
          // Si el error tiene campo 'general', lo mostramos, si no lo pasamos a backendErrors para los inputs
          if (err.error.general || err.error.message) {
            this.toastService.showApiError(err, 'Error al guardar proyecto');
          } else {
            this.backendErrors = err.error; 
          }
        } else {
          this.toastService.showApiError(err, 'Error no controlado al guardar proyecto');
        }
      }
    });
  }

  closeModal() {
    this.close.emit();
  }

  hasError(field: string): boolean {
    const control = this.projectForm.get(field);
    const isFrontendInvalid = control ? control.invalid && (control.dirty || control.touched) : false;
    const isBackendInvalid = !!this.backendErrors[field];
    return isFrontendInvalid || isBackendInvalid;
  }
}
