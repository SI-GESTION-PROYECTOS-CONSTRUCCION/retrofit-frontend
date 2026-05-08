import { Component, EventEmitter, inject, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProjectService } from '../../../../core/services/project.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-project-create-modal-component',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './project-create-modal-component.html',
  styleUrl: './project-create-modal-component.css',
})
export class ProjectCreateModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() projectCreated = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private projectService = inject(ProjectService);

  projectForm: FormGroup;
  isSubmitting = false;

  managers = [
    { id: 1, name: 'Carlos Mendoza' },
    //datos de backend
  ];

  constructor() {
    this.projectForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^PRJ-\d{4}-\d{3}$/)]],
      name: ['', [Validators.required, Validators.minLength(5)]],
      client: ['', Validators.required],
      status: ['PLANEAMIENTO', Validators.required],
      priority: ['MEDIA', Validators.required],
      managerId: [null, Validators.required]
    });
  }

  onSubmit() {
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const requestDto = this.projectForm.value;

    this.projectService.createProject(requestDto).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.projectCreated.emit();
        this.closeModal();
      },
      error: (err) => {
        console.error('Error al crear proyecto', err);
        this.isSubmitting = false;
      }
    });
  }

  closeModal() {
    this.close.emit();
  }

  isFieldInvalid(field: string): boolean {
    const control = this.projectForm.get(field);
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }
}
