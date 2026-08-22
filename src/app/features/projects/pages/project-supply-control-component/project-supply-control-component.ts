import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { SupplyControl } from '../../../../core/models/supply-control.model';
import { InventoryService } from '../../../../core/services/inventory.service';
import { ToastService } from '../../../../core/services/toast-service';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';

@Component({
	selector: 'app-project-supply-control',
	standalone: true,
	imports: [CommonModule, FormsModule, Skeleton, SelectModule],
	templateUrl: './project-supply-control-component.html',
	styleUrl: './project-supply-control-component.css',
})
export class ProjectSupplyControlComponent implements OnInit {
	@Input() projectId!: number;

	private inventoryService = inject(InventoryService);
	private toastService = inject(ToastService);

	supplyControls: SupplyControl[] = [];
	isLoading = true;
	errorMessage = '';

	filterStatus: string = '';
	filterName: string = '';
	readonly statusOptions = [
		{ label: 'Todos los estados', value: '' },
		{ label: 'Completo', value: 'OK' },
		{ label: 'Pendiente', value: 'PENDING' },
		{ label: 'Excedido', value: 'EXCESS' },
	];

	ngOnInit(): void {
		this.loadSupplyControl();
	}

	loadSupplyControl(): void {
		this.isLoading = true;
		this.inventoryService
			.getSupplyControl(this.projectId, this.filterStatus, this.filterName)
			.subscribe({
				next: (data) => {
					this.supplyControls = data;
					this.isLoading = false;
				},
				error: (err: HttpErrorResponse) => {
					this.toastService.showApiError(err, 'Error al cargar el control de abastecimiento');
					this.errorMessage = 'No se pudo cargar la información de abastecimiento.';
					this.isLoading = false;
				},
			});
	}
}
