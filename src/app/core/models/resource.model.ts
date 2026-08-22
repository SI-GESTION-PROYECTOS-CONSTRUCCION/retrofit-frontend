import { ProjectItemResourceResponseDto } from './project.model';

export enum ResourceType {
	LABOR = 'LABOR',
	MATERIAL = 'MATERIAL',
	EQUIPMENT = 'EQUIPMENT',
}

export interface ResourceResponseDto {
	id: number;
	name: string;
	unit: string;
	basePrice: number;
}

export interface ResourceRequestDto {
	name: string;
	unit: string;
	basePrice: number;
}

export interface ResourcePageResponseDto {
	content: ProjectItemResourceResponseDto[];
	totalPages: number;
	totalElements: number;
	currentPage: number;
}
