import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, inject, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import {
	ProjectItemDto,
	ProjectItemResourceRequestDto,
	ProjectItemResourceResponseDto,
} from '../../../../core/models/project.model';
import { ResourceResponseDto } from '../../../../core/models/resource.model';
import { ProjectItemService } from '../../../../core/services/project-item.service';
import { ResourceService } from '../../../../core/services/resource.service';
import { ToastService } from '../../../../core/services/toast-service';

@Component({
	selector: 'app-apu-modal-component',
	imports: [CommonModule, FormsModule, SelectModule],
	templateUrl: './apu-modal-component.html',
	styleUrl: './apu-modal-component.css',
})
export class ApuModalComponent {
	@Input({ required: true }) projectId!: number;

	// Recibimos un clon de los datos de la fila actual (para no mutar la tabla principal hasta guardar)
	@Input({ required: true }) itemData!: ProjectItemDto;

	@Output() onClose = new EventEmitter<void>();
	@Output() onSave = new EventEmitter<ProjectItemDto>(); // Emitimos la partida actualizada

	private catalogService = inject(ResourceService);
	private itemService = inject(ProjectItemService);
	private toastService = inject(ToastService);

	laborCatalog: ResourceResponseDto[] = [];
	materialCatalog: ResourceResponseDto[] = [];
	equipmentCatalog: ResourceResponseDto[] = [];

	apuItems: ProjectItemResourceResponseDto[] = [];
	calculatedUnitPrice: number = 0;

	selectedResourceType: string = 'LABOR';
	selectedResourceId: number | null = null;
	isLoading = false;
	readonly resourceTypeOptions = [
		{ label: 'Mano de obra', value: 'LABOR' },
		{ label: 'Materiales', value: 'MATERIAL' },
		{ label: 'Maquinaria y equipos', value: 'EQUIPMENT' },
	];
	readonly overlayOptions = { autoZIndex: true, baseZIndex: 1301 };

	get resourceOptions() {
		const catalog =
			this.selectedResourceType === 'LABOR'
				? this.laborCatalog
				: this.selectedResourceType === 'MATERIAL'
					? this.materialCatalog
					: this.equipmentCatalog;
		return catalog.map((resource) => ({
			label: `${resource.name} — S/ ${resource.basePrice}`,
			value: resource.id,
		}));
	}

	onResourceTypeChange(): void {
		this.selectedResourceId = null;
	}

	preventNegative(event: KeyboardEvent) {
		if (event.key === '-' || event.key === 'e') {
			event.preventDefault();
		}
	}

	ngOnInit() {
		// 1. Iniciamos el "carrito de compras" con lo que ya tenga la partida
		this.apuItems = JSON.parse(JSON.stringify(this.itemData.apuDetails || []));
		this.recalculateApu();

		// 2. Cargamos la ferretería en segundo plano
		this.catalogService
			.getResources('labor-categories')
			.subscribe((data) => (this.laborCatalog = data));
		this.catalogService
			.getResources('materials')
			.subscribe((data) => (this.materialCatalog = data));
		this.catalogService
			.getResources('equipment')
			.subscribe((data) => (this.equipmentCatalog = data));
	}

	addResourceToApu() {
		if (!this.selectedResourceId) return;

		let catalog: ResourceResponseDto[];
		let typeStr: string;
		if (this.selectedResourceType === 'LABOR') {
			catalog = this.laborCatalog;
			typeStr = 'LABOR';
		} else if (this.selectedResourceType === 'MATERIAL') {
			catalog = this.materialCatalog;
			typeStr = 'MATERIAL';
		} else {
			catalog = this.equipmentCatalog;
			typeStr = 'EQUIPMENT';
		}

		const resource = catalog.find((r) => r.id === Number(this.selectedResourceId));
		if (!resource) return;

		if (this.apuItems.some((i) => i.resourceId === resource.id)) {
			this.toastService.show('El recurso ya está en el APU', 'warning');
			return;
		}

		this.apuItems.push({
			id: 0,
			resourceId: resource.id,
			resourceName: resource.name,
			resourceUnit: resource.unit,
			resourceBasePrice: resource.basePrice,
			resourceType: typeStr,
			squad: typeStr === 'MATERIAL' ? 0 : 1.0,
			quantity: 0,
			partialPrice: 0,
		});

		this.selectedResourceId = null;
		this.recalculateApu();
	}

	removeApuItem(index: number) {
		this.apuItems.splice(index, 1);
		this.recalculateApu();
	}

	recalculateApu() {
		// 🚨 1. FORZAMOS A QUE SEAN NÚMEROS (Si están vacíos, valen 0)
		const laborYield = Number(this.itemData.laborYield) || 0;
		const equipmentYield = Number(this.itemData.equipmentYield) || 0;

		let total = 0;

		this.apuItems.forEach((apu) => {
			const squad = Number(apu.squad) || 0;

			// Cálculo de cantidad para Mano de Obra y Equipos (Fórmula S10)
			if (apu.resourceType === 'LABOR' && laborYield > 0) {
				apu.quantity = (squad * 8.0) / laborYield;
			} else if (apu.resourceType === 'EQUIPMENT' && equipmentYield > 0) {
				apu.quantity = (squad * 8.0) / equipmentYield;
			}

			// 3. Redondeo y suma
			apu.quantity = Math.round(apu.quantity * 10000.0) / 10000.0;
			apu.partialPrice = Math.round(apu.quantity * Number(apu.resourceBasePrice) * 100.0) / 100.0;

			total += apu.partialPrice;
		});

		this.calculatedUnitPrice = total;
	}

	saveApu() {
		const payload: ProjectItemResourceRequestDto[] = this.apuItems.map((i) => ({
			resourceId: i.resourceId,
			squad: i.squad,
			quantity: i.quantity,
		}));

		this.isLoading = true;

		const laborY = Number(this.itemData.laborYield || 0);
		const equipY = Number(this.itemData.equipmentYield || 0);

		this.itemService
			// biome-ignore lint/style/noNonNullAssertion: Partidas must have an ID when editing APU
			.saveApuDetails(this.projectId, this.itemData.id!, laborY, equipY, payload)
			.subscribe({
				next: (updatedItem) => {
					this.toastService.show('APU calculado y guardado con éxito', 'success');
					this.onSave.emit(updatedItem);
				},
				error: (err: HttpErrorResponse) => {
					this.toastService.showApiError(err, 'Error al guardar el APU');
					this.isLoading = false;
				},
			});
	}

	isYieldValid(): boolean {
		const hasLabor = this.apuItems.some((i) => i.resourceType === 'LABOR');
		const hasEquipment = this.apuItems.some((i) => i.resourceType === 'EQUIPMENT');
		const laborY = Number(this.itemData.laborYield) || 0;
		const equipY = Number(this.itemData.equipmentYield) || 0;

		if (hasLabor && laborY <= 0) return false;
		if (hasEquipment && equipY <= 0) return false;

		return true;
	}
}
