import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AccessibilityWidgetComponent } from './shared/components/accessibility-widget/accessibility-widget.component';
import { ToastComponent } from './shared/components/toast.component/toast.component';

@Component({
	selector: 'app-root',
	imports: [RouterOutlet, ToastComponent, AccessibilityWidgetComponent],
	templateUrl: './app.html',
	styleUrl: './app.css',
})
export class App {
	protected readonly title = signal('retrofit-frontend');
}
