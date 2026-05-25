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

export interface ProjectDashboardResponseDto {
  projectId: number;
  projectName: string;
  plannedValue: number;
  earnedValue: number;
  actualCost: number;
  costVariance: number;
  cpi: number;
  totalLaborCost: number;
  totalMaterialCost: number;
  totalEquipmentCost: number;
  criticalItems: CriticalItemDto[];
  timeEvolution: TimeEvolutionDto[];
}