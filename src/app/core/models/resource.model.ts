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