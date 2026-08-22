import { Component, EventEmitter, Output } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';

@Component({
	selector: 'app-header',
	imports: [AvatarModule, ButtonModule],
	templateUrl: './header.html',
	styleUrl: './header.css',
})
export class Header {
	@Output() toggleMenu = new EventEmitter<void>();

	onToggleMenu() {
		this.toggleMenu.emit();
	}
}
