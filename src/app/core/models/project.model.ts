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
  currentProgress: number;
  managerFullName: string;
}