import { Directive, Input, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

@Directive({
	selector: '[appHasPermission]',
})
export class HasPermissionDirective {
	private authService = inject(AuthService);
	private templateRef = inject(TemplateRef<unknown>);
	private viewContainer = inject(ViewContainerRef);

	@Input() set appHasPermission(permission: string) {
		if (this.authService.hasPermission(permission)) {
			this.viewContainer.createEmbeddedView(this.templateRef);
		} else {
			this.viewContainer.clear();
		}
	}
}