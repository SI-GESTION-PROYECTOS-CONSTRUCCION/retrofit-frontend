declare module 'frappe-gantt' {
	export interface FrappeGanttTask {
		id: string;
		name: string;
		start: string;
		end: string;
		progress: number;
		dependencies?: string;
		custom_class?: string;
		description?: string;
		[key: string]: unknown;
	}

	export interface FrappeGanttViewMode {
		name: string;
		padding: string | [string, string];
		step: string;
		date_format: string;
		column_width: number;
		lower_text?: string | ((date: Date, lastDate: Date | null, language: string) => string);
		upper_text?: string | ((date: Date, lastDate: Date | null, language: string) => string);
		thick_line?: (date: Date) => boolean;
		snap_at?: string;
	}

	export interface FrappeGanttOptions {
		view_mode?: string;
		view_modes?: Array<string | FrappeGanttViewMode>;
		language?: string;
		column_width?: number;
		bar_height?: number;
		padding?: number;
		lines?: 'none' | 'vertical' | 'horizontal' | 'both';
		readonly_progress?: boolean;
		readonly_dates?: boolean;
		popup_on?: 'click' | 'hover';
		scroll_to?: 'today' | 'start' | 'end' | string;
		today_button?: boolean;
		infinite_padding?: boolean;
		holidays?: Record<string, string | string[]>;
		popup?: (context: {
			task: FrappeGanttTask;
			set_title: (title: string) => void;
			set_subtitle: (subtitle: string) => void;
			set_details: (details: string) => void;
		}) => void;
		on_date_change?: (task: FrappeGanttTask, start: Date, end: Date) => void;
	}

	export default class Gantt {
		constructor(wrapper: HTMLElement | string, tasks: FrappeGanttTask[], options?: FrappeGanttOptions);
		refresh(tasks?: FrappeGanttTask[]): void;
		change_view_mode(mode: string, maintainPosition?: boolean): void;
	}
}
