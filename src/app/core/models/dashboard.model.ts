export interface TimeEvolutionDto {
	dateLabel: string;
	plannedValueAccumulated: number;
	earnedValueAccumulated: number;
	actualCostAccumulated: number;
}

export interface CriticalItemDto {
	itemId: number;
	itemCode: string;
	description: string;
	earnedValue: number;
	actualCost: number;
	lossAmount: number;
}

export interface LatestProgressDto {
	reportId: number;
	date: string;
	itemCode: string;
	itemDescription: string;
	executedQuantity: number;
	unit: string;
}

export interface ProjectDashboardResponseDto {
	projectId: number;
	projectCode: string;
	projectName: string;
	plannedValue: number;
	earnedValue: number;
	actualCost: number;
	costVariance: number;
	cpi: number;
	avanceTotalEjecutado: number;
	avanceTotalPlanificado: number;
	porcentajeAvance: number;
	itemUnit: string;
	totalLaborCost: number;
	totalMaterialCost: number;
	totalEquipmentCost: number;
	criticalItems: CriticalItemDto[];
	timeEvolution: TimeEvolutionDto[];
	recentProgresses: LatestProgressDto[];
}
