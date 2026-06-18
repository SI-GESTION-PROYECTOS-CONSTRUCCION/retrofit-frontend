import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../../../core/services/inventory.service';
import { SupplyControl } from '../../../../core/models/supply-control.model';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';

@Component({
  selector: 'app-project-supply-control',
  standalone: true,
  imports: [CommonModule, FormsModule, Skeleton],
  templateUrl: './project-supply-control-component.html',
  styleUrl: './project-supply-control-component.css'
})
export class ProjectSupplyControlComponent implements OnInit {
  @Input() projectId!: number;
  
  private inventoryService = inject(InventoryService);
  
  supplyControls: SupplyControl[] = [];
  isLoading = true;
  errorMessage = '';

  filterStatus: string = '';
  filterName: string = '';

  ngOnInit(): void {
    this.loadSupplyControl();
  }

  loadSupplyControl(): void {
    this.isLoading = true;
    this.inventoryService.getSupplyControl(this.projectId, this.filterStatus, this.filterName).subscribe({
      next: (data) => {
        this.supplyControls = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error al cargar el control de abastecimiento:', err);
        this.errorMessage = 'No se pudo cargar la información de abastecimiento.';
        this.isLoading = false;
      }
    });
  }
}
