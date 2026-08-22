import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
@Component({
	selector: 'app-confirm-modal',
	imports: [CommonModule],
	templateUrl: './confirm-modal.html',
	styleUrl: './confirm-modal.css',
})
export class ConfirmModal {
	@Input() title: string = 'Confirmar Acción';
	@Input() message: string = '¿Estás seguro de realizar esta acción?';
	@Input() confirmText: string = 'Confirmar';
	@Input() isProcessing: boolean = false;

	@Output() confirm = new EventEmitter<void>();
	@Output() cancel = new EventEmitter<void>();

	onConfirm() {
		this.confirm.emit();
	}

	onCancel() {
		this.cancel.emit();
	}
}
