export interface ProjectResponseDto {
  id: number;
  code: string;
  name: string;
  client: string;
  status: string;
  priority: string;
  currentProgress: number;
  managerFullName: string;
}


export interface ProjectRequestDto {
  code: string;
  name: string;
  client: string;
  status: string;
  priority: string;
  managerId: number;
}