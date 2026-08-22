import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Tema base de Retrofit. Los componentes de PrimeNG consumen estos tokens y
 * las pantallas propias usan las mismas variables semánticas en styles.css.
 */
export const RetrofitPreset = definePreset(Aura, {
	semantic: {
		primary: {
			50: '#eaf4ff',
			100: '#d5e9fb',
			200: '#add4f5',
			300: '#77b7ec',
			400: '#3d91dd',
			500: '#186fc2',
			600: '#1158a5',
			700: '#0e4685',
			800: '#103c6f',
			900: '#12335c',
			950: '#0b1f3a',
		},
		focusRing: {
			width: '2px',
			style: 'solid',
			color: '{primary.400}',
			offset: '2px',
		},
	},
});
