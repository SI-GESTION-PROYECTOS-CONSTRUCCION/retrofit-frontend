import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import {
	InventoryTransactionResponse,
	PlannedResource,
	StockSummary,
	TransactionReason,
} from '../../../../core/models/inventory.model';
import { Page } from '../../../../core/models/page.model';
import { ProjectItemDto } from '../../../../core/models/project.model';
import { InventoryService } from '../../../../core/services/inventory.service';
import { ProjectItemService } from '../../../../core/services/project-item.service';
import { ToastService } from '../../../../core/services/toast-service';

@Component({
	selector: 'app-project-inventory',
	standalone: true,
	imports: [ReactiveFormsModule, CommonModule, HasPermissionDirective, SelectModule],
	templateUrl: './project-inventory-component.html',
	styleUrls: ['./project-inventory-component.css'],
})
export class ProjectInventoryComponent implements OnInit {
	@Input({ required: true }) projectId!: number;

	private fb = inject(FormBuilder);
	private inventoryService = inject(InventoryService);
	private projectItemService = inject(ProjectItemService);
	private toastService = inject(ToastService);
	isLoading = false;
	isDownloadingPdf = false;
	showInboundModal = false;
	showOutboundModal = false;

	inboundForm!: FormGroup;
	outboundForm!: FormGroup;

	resources: PlannedResource[] = [];
	projectItems: ProjectItemDto[] = [];
	filteredProjectItems: ProjectItemDto[] = [];

	inventoryData: StockSummary[] = [];

	showKardexModal = false;
	kardexData: InventoryTransactionResponse[] = [];
	selectedResourceName = '';
	searchTerm = '';

	currentPage = 1;
	itemsPerPage = 10;
	totalElements = 0;
	totalPages = 0;
	readonly modalOverlayOptions = { autoZIndex: true, baseZIndex: 1301 };
	readonly inboundReasonOptions = [
		{ label: 'Compra a proveedor', value: TransactionReason.PURCHASE },
		{ label: 'Inventario inicial', value: TransactionReason.INITIAL_BALANCE },
	];
	readonly outboundReasonOptions = [
		{ label: 'Consumo en obra', value: TransactionReason.CONSUMPTION },
		{ label: 'Pérdida / merma', value: TransactionReason.LOSS },
	];

	get resourceOptions() {
		return this.resources.map((resource) => ({
			label: `${resource.name} (${resource.unit})`,
			value: resource.id,
		}));
	}

	get projectItemOptions() {
		return this.filteredProjectItems.map((item) => ({
			label: `${item.code || ''} - ${item.description}`,
			value: item.id,
		}));
	}

	get startIndex(): number {
		if (this.totalElements === 0) return 0;
		return (this.currentPage - 1) * this.itemsPerPage + 1;
	}

	get endIndex(): number {
		return Math.min(this.currentPage * this.itemsPerPage, this.totalElements);
	}

	nextPage(): void {
		if (this.currentPage < this.totalPages) {
			this.currentPage++;
			this.loadInventory();
		}
	}

	onSearchChange(event: Event): void {
		this.searchTerm = (event.target as HTMLInputElement).value;
		this.currentPage = 1;
		this.loadInventory();
	}

	previousPage(): void {
		if (this.currentPage > 1) {
			this.currentPage--;
			this.loadInventory();
		}
	}

	ngOnInit(): void {
		this.initForms();
		this.loadInventory();
		this.loadDropdownData();
	}

	private initForms(): void {
		this.inboundForm = this.fb.group({
			resourceId: ['', Validators.required],
			reason: [TransactionReason.PURCHASE, Validators.required],
			quantity: [null, [Validators.required, Validators.min(0.01)]],
			referenceDocument: [''],
			observations: [''],
		});

		this.outboundForm = this.fb.group({
			resourceId: ['', Validators.required],
			projectItemId: [{ value: '', disabled: true }, Validators.required],
			reason: [TransactionReason.CONSUMPTION, Validators.required],
			quantity: [null, [Validators.required, Validators.min(0.01)]],
			referenceDocument: [''],
			observations: [''],
		});

		this.outboundForm.get('resourceId')?.valueChanges.subscribe((resourceId) => {
			const projectItemControl = this.outboundForm.get('projectItemId');
			if (resourceId) {
				this.filteredProjectItems = this.projectItems.filter((item) =>
					item.apuDetails?.some((apu) => apu.resourceId === resourceId),
				);
				projectItemControl?.enable();
			} else {
				this.filteredProjectItems = [];
				projectItemControl?.disable();
			}
			projectItemControl?.setValue('');
		});
	}

	loadInventory(): void {
		this.isLoading = true;
		this.inventoryService
			.getProjectStockSummary(
				this.projectId,
				this.searchTerm,
				this.currentPage - 1,
				this.itemsPerPage,
			)
			.subscribe({
				next: (pageData: Page<StockSummary> | StockSummary[]) => {
					if (Array.isArray(pageData)) {
						this.inventoryData = pageData;
						this.totalElements = pageData.length;
						this.totalPages = Math.ceil(pageData.length / this.itemsPerPage);
					} else {
						this.inventoryData = pageData.content || [];
						this.totalElements = pageData.totalElements || 0;
						this.totalPages = pageData.totalPages || 0;
					}
					this.isLoading = false;
				},
				error: (err: HttpErrorResponse) => {
					this.toastService.showApiError(err, 'Error al cargar el inventario');
					this.inventoryData = [];
					this.totalElements = 0;
					this.totalPages = 0;
					this.isLoading = false;
				},
			});
	}

	private loadDropdownData(): void {
		this.inventoryService.getPlannedMaterials(this.projectId).subscribe({
			next: (data) => {
				this.resources = data;
			},
			error: (err: HttpErrorResponse) =>
				this.toastService.showApiError(err, 'Error cargando materiales planificados'),
		});

		this.projectItemService.getItems(this.projectId).subscribe({
			next: (data) => {
				this.projectItems = data.filter((item) => item.unit && item.unit.trim() !== '');
			},
			error: (err: HttpErrorResponse) =>
				this.toastService.showApiError(err, 'Error cargando partidas'),
		});
	}

	openInboundModal() {
		this.inboundForm.reset({ reason: TransactionReason.PURCHASE });
		this.showInboundModal = true;
	}

	openOutboundModal(resourceId?: number) {
		this.outboundForm.reset({
			reason: TransactionReason.CONSUMPTION,
			resourceId: resourceId || '',
		});
		this.showOutboundModal = true;
	}

	openKardexModal(resourceId: number, resourceName: string) {
		this.selectedResourceName = resourceName;
		this.isLoading = true;

		this.inventoryService.getKardex(this.projectId, resourceId).subscribe({
			next: (data) => {
				this.kardexData = data;
				this.showKardexModal = true;
				this.isLoading = false;
			},
			error: (err: HttpErrorResponse) => {
				this.toastService.showApiError(err, 'Error cargando kardex');
				this.isLoading = false;
			},
		});
	}

	closeModals() {
		this.showInboundModal = false;
		this.showOutboundModal = false;
		this.showKardexModal = false;
	}

	submitInbound() {
		if (this.inboundForm.invalid) return;
		const request = {
			...this.inboundForm.value,
			projectId: this.projectId,
		};

		this.inventoryService.registerInbound(request).subscribe({
			next: () => {
				this.closeModals();
				this.loadInventory();
			},
			error: (err: HttpErrorResponse) => {
				this.toastService.showApiError(err, 'Error al guardar la transacción');
			},
		});
	}

	submitOutbound() {
		if (this.outboundForm.invalid) return;
		const request = {
			...this.outboundForm.value,
			projectId: this.projectId,
		};

		this.inventoryService.registerOutbound(request).subscribe({
			next: () => {
				this.closeModals();
				this.loadInventory();
			},
			error: (err: HttpErrorResponse) => {
				this.toastService.showApiError(err, 'Error al guardar la transacción');
			},
		});
	}

	generateReport(type: 'pdf' | 'excel') {
		this.isDownloadingPdf = true;
		this.toastService.show('Generando reporte...', 'success');
		this.inventoryService.downloadInventoryReport(this.projectId).subscribe({
			next: (blob: Blob) => {
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `Reporte_Inventario_Proyecto_${this.projectId}.${type === 'pdf' ? 'pdf' : 'xlsx'}`;
				a.click();
				window.URL.revokeObjectURL(url);
				this.isDownloadingPdf = false;
			},
			error: (err: HttpErrorResponse) => {
				this.toastService.showApiError(err, 'Error al generar el reporte');
				this.isDownloadingPdf = false;
			},
		});
	}
}
