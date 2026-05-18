export interface ProjectRequestDto {
  code: string;
  name: string;
  client: string;
  location: string;             
  description: string;         
  estimatedDeliveryDate: string;
  status: string;
  priority: string;
  managerId: number;
}

export interface ProjectResponseDto {
  id: number;
  code: string;
  name: string;
  client: string;
  location: string;            
  description: string;          
  estimatedDeliveryDate: string;
  status: string;
  priority: string;
  managerId: number;
  totalBudget: number;
  currentProgress: number;
  managerFullName: string;
}
export interface ProjectItemDto {
  id?: number;
  itemOrder?: number;
  description: string;
  code: string;
  unit: string;
  totalQuantity: number;
  unitPrice: number;
  executedQuantity?: number;
  
  level?: number; 
  laborYield?: number;
  equipmentYield?: number;
  apuDetails?: ProjectItemResourceResponseDto[]; // Lista que vendrá del backend con los recursos
}

export interface ProjectItemResourceRequestDto {
  resourceId: number;
  squad: number | null;
  quantity: number | null;
}

export interface ProjectItemResourceResponseDto {
  id: number;
  resourceId: number;
  resourceName: string;
  resourceUnit: string;
  resourceBasePrice: number;
  resourceType: string; // 'LABOR' | 'EQUIPMENT' | 'MATERIAL'
  squad: number;
  quantity: number;
  partialPrice: number;
}

export interface ProgressReportRequestDto{
  projectItemId: number;
  reportDate: string;
  executedQuantity: number;
  observations: string;
}


export interface ProgressReportResponseDto {
  id: number;
  itemCode: string;
  itemDescription: string;
  reportDate: string;
  executedQuantity: number;
  unit: string;
  observations: string;
  photoUrls: string[];
}


export interface GroupedProgressReportDto {
  period: string;
  reports: ProgressReportResponseDto[]; 
}