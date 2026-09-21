import { Injectable, signal } from '@angular/core';

export type ContrastMode = 'off' | 'medium' | 'high';
export type TextSizeMode = 'normal' | 'large' | 'larger' | 'xlarge';
export type TextSpacingMode = 'normal' | 'moderate' | 'heavy';
export type ColorFilterMode = 'none' | 'grayscale' | 'protanopia' | 'deuteranopia' | 'tritanopia';

export interface AccessibilitySettings {
	contrast: ContrastMode;
	textSize: TextSizeMode;
	textSpacing: TextSpacingMode;
	dyslexiaFont: boolean;
	largeCursor: boolean;
	pauseAnimations: boolean;
	colorFilter: ColorFilterMode;
	hideImages: boolean;
	screenReader: boolean;
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
	contrast: 'off',
	textSize: 'normal',
	textSpacing: 'normal',
	dyslexiaFont: false,
	largeCursor: false,
	pauseAnimations: false,
	colorFilter: 'none',
	hideImages: false,
	screenReader: false,
};

const STORAGE_KEY = 'retrofit_a11y_settings';

@Injectable({
	providedIn: 'root',
})
export class AccessibilityService {
	readonly settings = signal<AccessibilitySettings>(this.loadSettings());
	private speechHandler: ((event: MouseEvent) => void) | null = null;

	constructor() {
		this.applyToDom(this.settings());
		if (this.settings().screenReader) {
			this.enableSpeech();
		}
	}

	private loadSettings(): AccessibilitySettings {
		if (typeof window === 'undefined' || !window.localStorage) {
			return { ...DEFAULT_SETTINGS };
		}
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) {
				return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
			}
		} catch {
			// Fallback on storage read error
		}
		return { ...DEFAULT_SETTINGS };
	}

	private saveSettings(settings: AccessibilitySettings): void {
		if (typeof window === 'undefined' || !window.localStorage) return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
		} catch {
			// Ignore storage write quota error
		}
	}

	private update(updater: (prev: AccessibilitySettings) => AccessibilitySettings): void {
		const next = updater(this.settings());
		this.settings.set(next);
		this.saveSettings(next);
		this.applyToDom(next);
	}

	private applyToDom(settings: AccessibilitySettings): void {
		if (typeof document === 'undefined') return;
		const body = document.body;

		body.setAttribute('data-a11y-contrast', settings.contrast);
		body.setAttribute('data-a11y-text-size', settings.textSize);
		body.setAttribute('data-a11y-text-spacing', settings.textSpacing);
		body.setAttribute('data-a11y-dyslexia', String(settings.dyslexiaFont));
		body.setAttribute('data-a11y-cursor', String(settings.largeCursor));
		body.setAttribute('data-a11y-motion', settings.pauseAnimations ? 'reduced' : 'normal');
		body.setAttribute('data-a11y-filter', settings.colorFilter);
		body.setAttribute('data-a11y-hide-images', String(settings.hideImages));
	}

	cycleContrast(): void {
		this.update((s) => {
			const next: ContrastMode =
				s.contrast === 'off' ? 'medium' : s.contrast === 'medium' ? 'high' : 'off';
			return { ...s, contrast: next };
		});
	}

	cycleTextSize(): void {
		this.update((s) => {
			const next: TextSizeMode =
				s.textSize === 'normal'
					? 'large'
					: s.textSize === 'large'
						? 'larger'
						: s.textSize === 'larger'
							? 'xlarge'
							: 'normal';
			return { ...s, textSize: next };
		});
	}

	cycleTextSpacing(): void {
		this.update((s) => {
			const next: TextSpacingMode =
				s.textSpacing === 'normal' ? 'moderate' : s.textSpacing === 'moderate' ? 'heavy' : 'normal';
			return { ...s, textSpacing: next };
		});
	}

	toggleDyslexiaFont(): void {
		this.update((s) => ({ ...s, dyslexiaFont: !s.dyslexiaFont }));
	}

	toggleLargeCursor(): void {
		this.update((s) => ({ ...s, largeCursor: !s.largeCursor }));
	}

	togglePauseAnimations(): void {
		this.update((s) => ({ ...s, pauseAnimations: !s.pauseAnimations }));
	}

	cycleColorFilter(): void {
		this.update((s) => {
			const sequence: ColorFilterMode[] = [
				'none',
				'grayscale',
				'protanopia',
				'deuteranopia',
				'tritanopia',
			];
			const currentIdx = sequence.indexOf(s.colorFilter);
			const next = sequence[(currentIdx + 1) % sequence.length];
			return { ...s, colorFilter: next };
		});
	}

	toggleHideImages(): void {
		this.update((s) => ({ ...s, hideImages: !s.hideImages }));
	}

	toggleScreenReader(): void {
		const nextState = !this.settings().screenReader;
		this.update((s) => ({ ...s, screenReader: nextState }));
		if (nextState) {
			this.enableSpeech();
			this.speak('Lector de pantalla activado. Haga clic en cualquier texto para escucharlo.');
		} else {
			this.disableSpeech();
		}
	}

	private enableSpeech(): void {
		if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
		this.disableSpeech();

		this.speechHandler = (e: MouseEvent) => {
			const target = e.target as HTMLElement | null;
			if (!target) return;

			// Skip clicking inside the accessibility widget itself
			if (target.closest('.a11y-widget-container')) return;

			const text =
				target.getAttribute('aria-label') ||
				target.getAttribute('alt') ||
				target.getAttribute('title') ||
				target.innerText?.trim();

			if (text && text.length > 0) {
				this.speak(text.slice(0, 200));
			}
		};

		document.addEventListener('click', this.speechHandler, { capture: true });
	}

	private disableSpeech(): void {
		if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
			window.speechSynthesis.cancel();
		}
		if (this.speechHandler && typeof document !== 'undefined') {
			document.removeEventListener('click', this.speechHandler, { capture: true });
			this.speechHandler = null;
		}
	}

	speak(text: string): void {
		if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
		window.speechSynthesis.cancel();
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.lang = 'es-ES';
		utterance.rate = 1.0;
		window.speechSynthesis.speak(utterance);
	}

	resetAll(): void {
		this.disableSpeech();
		this.settings.set({ ...DEFAULT_SETTINGS });
		this.saveSettings({ ...DEFAULT_SETTINGS });
		this.applyToDom({ ...DEFAULT_SETTINGS });
	}
}
