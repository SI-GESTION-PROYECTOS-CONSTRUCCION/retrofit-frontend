import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ProjectService } from '../../../../core/services/project.service';
import { UserService } from '../../../../core/services/user.service';
import { UserDto } from '../../../../core/models/user.model';
import { ProjectResponseDto } from '../../../../core/models/project.model';

@Component({
  selector: 'app-project-create-modal-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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

  projectForm: FormGroup;
  isSubmitting = false;
  managers: UserDto[] = [];
  
  backendErrors: { [key: string]: string } = {};

  constructor() {
    this.projectForm = this.fb.group({
      code: ['', Validators.required],
      name: ['', Validators.required],
      client: ['', Validators.required],
      location: [''],
      description: [''],
      estimatedDeliveryDate: ['', Validators.required],
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
        estimatedDeliveryDate: this.projectToEdit.estimatedDeliveryDate,
        status: this.projectToEdit.status,
        priority: this.projectToEdit.priority
        // managerId lo setearemos después de cargar la lista de managers
      });
    }
  }

  loadManagers() {
    this.userService.getUsersByRole('ALL').subscribe({
      next: (users) => {
        this.managers = users;
        
        if (this.projectToEdit && this.projectToEdit.managerId) {
          this.projectForm.patchValue({
            managerId: this.projectToEdit.managerId
          });
        }
      },
      error: (err) => console.error('Error al cargar responsables', err)
    });
  }

  onSubmit() {
    this.backendErrors = {};
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const requestDto = this.projectForm.value;

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
        if (err.status === 400 && err.error) {
          this.backendErrors = err.error; 
        } else {
          console.error('Error no controlado al guardar proyecto', err);
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