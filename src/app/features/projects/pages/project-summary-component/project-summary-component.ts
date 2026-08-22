import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectResponseDto } from '../../../../core/models/project.model';

@Component({
	selector: 'app-project-summary-component',
	standalone: true,
	imports: [CommonModule, RouterLink],
	templateUrl: './project-summary-component.html',
	styleUrl: './project-summary-component.css',
})
export class ProjectSummaryComponent implements OnInit {
	@Input({ required: true }) project!: ProjectResponseDto;

	ngOnInit(): void {}

	formatDate(dateString: string): string {
		if (!dateString) return 'Sin fecha';
		const date = new Date(`${dateString}T00:00:00`);
		return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
	}
}
