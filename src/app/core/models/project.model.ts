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
  description: string;
  code: string;
  unit: string;
  totalQuantity: number;
  unitPrice: number;
  executedQuantity?: number;
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