import { Component, HostListener, inject, signal } from '@angular/core';
import { AccessibilityService } from '../../../core/services/accessibility.service';

@Component({
	selector: 'app-accessibility-widget',
	standalone: true,
	templateUrl: './accessibility-widget.component.html',
	styleUrl: './accessibility-widget.component.css',
})
export class AccessibilityWidgetComponent {
	readonly a11y = inject(AccessibilityService);
	readonly isOpen = signal(false);

	togglePanel(): void {
		this.isOpen.update((v) => !v);
	}

	closePanel(): void {
		this.isOpen.set(false);
	}

	@HostListener('document:keydown.escape')
	onEscapePress(): void {
		if (this.isOpen()) {
			this.closePanel();
		}
	}

	get contrastBadge(): string {
		const c = this.a11y.settings().contrast;
		if (c === 'high') return 'Alto';
		if (c === 'medium') return 'Invertido';
		return 'Normal';
	}

	get textSizeBadge(): string {
		const t = this.a11y.settings().textSize;
		if (t === 'large') return '+15%';
		if (t === 'larger') return '+30%';
		if (t === 'xlarge') return '+45%';
		return 'Normal';
	}

	get textSpacingBadge(): string {
		const s = this.a11y.settings().textSpacing;
		if (s === 'moderate') return 'Medio';
		if (s === 'heavy') return 'Amplio';
		return 'Normal';
	}

	get colorFilterBadge(): string {
		const f = this.a11y.settings().colorFilter;
		switch (f) {
			case 'grayscale':
				return 'Grises';
			case 'protanopia':
				return 'Protan';
			case 'deuteranopia':
				return 'Deuter';
			case 'tritanopia':
				return 'Tritan';
			default:
				return 'Normal';
		}
	}
}
