import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
	ApplicationConfig,
	provideBrowserGlobalErrorListeners,
	provideZoneChangeDetection,
} from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth-interceptor';
import { RetrofitPreset } from './core/theme/retrofit-preset';

export const appConfig: ApplicationConfig = {
	providers: [
		provideBrowserGlobalErrorListeners(),
		provideZoneChangeDetection({ eventCoalescing: true }),
		provideRouter(routes),
		provideHttpClient(withInterceptors([authInterceptor])),
		provideAnimationsAsync(),
		providePrimeNG({
			theme: {
				preset: RetrofitPreset,
				options: {
					darkModeSelector: false,
				},
			},
		}),
	],
};
