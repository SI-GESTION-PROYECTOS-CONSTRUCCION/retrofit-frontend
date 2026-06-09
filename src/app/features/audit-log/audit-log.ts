import { Component, inject, OnInit } from '@angular/core';
import { AuditService } from '../../core/services/audit.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditLog } from '../../core/models/auditLog.model';
import { Skeleton } from '../../shared/components/skeleton/skeleton';

@Component({
  selector: 'app-audit-log',
  imports: [CommonModule, FormsModule, Skeleton],
  templateUrl: './audit-log.html',
  styleUrl: './audit-log.css',
})
export class AuditLogComponent implements OnInit {
  private auditService = inject(AuditService);

  isLoading = true;
  logs: AuditLog[] = [];
  selectedLog: AuditLog | null = null;
  
  currentPage = 0;
  totalPages = 0;
  totalElements = 0;

  searchTerm: string = '';
  selectedModule: string = 'Todos';
  selectedAction: string = 'Todas';
  selectedDate: string = '';

  stats = {
    todayEvents: 0,
    modifications: 0,
    alerts: 0
  };

  ngOnInit(): void {
    this.loadStats();
    this.loadLogs();
  }

  loadStats(): void {
    this.auditService.getStats().subscribe({
      next: (res) => this.stats = res,
      error: (err) => console.error('Error cargando stats', err)
    });
  }

  loadLogs(): void {
    this.isLoading = true;
    this.auditService.getLogs(
      this.currentPage, 
      10, 
      this.searchTerm, 
      this.selectedModule, 
      this.selectedAction, 
      this.selectedDate
    ).subscribe({
      next: (response) => {
        this.logs = response.content;
        this.totalPages = response.totalPages;
        this.totalElements = response.totalElements;
        if (this.logs.length > 0) {
          this.selectLog(this.logs[0]);
        } else {
          this.selectedLog = null;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error al cargar logs', err);
        this.isLoading = false;
      }
    });
  }

  selectLog(log: AuditLog): void {
    this.selectedLog = { ...log }; 

    try {
      if (this.selectedLog.oldData !== 'null') {
        this.selectedLog.oldData = JSON.parse(this.selectedLog.oldData);
      }
      if (this.selectedLog.newData !== 'null') {
        this.selectedLog.newData = JSON.parse(this.selectedLog.newData);
      }
    } catch (e) {
      console.error('Error parseando JSON de auditoría', e);
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadLogs();
    }
  }

  prevPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadLogs();
    }
  }

  getBadgeClass(action: string): string {
    switch (action?.toUpperCase()) {
      case 'UPDATE': return 'badge-update';
      case 'CREATE': return 'badge-create';
      case 'DELETE': return 'badge-delete';
      case 'LOGIN':  return 'badge-login';
      case 'EXPORT': return 'badge-export';
      default:       return 'badge-login';
    }
  }

  applyFilters(): void {
    this.currentPage = 0;
    this.loadLogs(); 
  }

  // Devuelve true si el registro cumple las condiciones de alerta
  isAlert(log: AuditLog): boolean {
    const isDelete = log.action?.toUpperCase() === 'DELETE';
    const isRoleModule = log.module === 'Roles';
    // Si tienes EXPORT o LOGIN_FAILED en el futuro, los sumas aquí
    return isDelete || isRoleModule;
  }
}
