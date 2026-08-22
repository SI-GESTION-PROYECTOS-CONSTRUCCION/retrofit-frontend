import { Injectable } from '@angular/core';

@Injectable({
	providedIn: 'root',
})
export class ResponsiveService {
	get isMobile(): boolean {
		return window.matchMedia('(max-width: 768px)').matches;
	}
}
