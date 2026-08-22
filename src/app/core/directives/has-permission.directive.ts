import { Directive, Input, inject, TemplateRef, ViewContainerRef } from '@angular/core';
import { AppPermission } from '../constants/permissions.constants';
import { AuthService } from '../services/auth.service';

@Directive({
	selector: '[appHasPermission]',
})
export class HasPermissionDirective {
	private authService = inject(AuthService);
	private templateRef = inject(TemplateRef<unknown>);
	private viewContainer = inject(ViewContainerRef);

	@Input() set appHasPermission(permission: keyof typeof AppPermission) {
		if (this.authService.hasPermission(permission)) {
			this.viewContainer.createEmbeddedView(this.templateRef);
		} else {
			this.viewContainer.clear();
		}
	}
}
