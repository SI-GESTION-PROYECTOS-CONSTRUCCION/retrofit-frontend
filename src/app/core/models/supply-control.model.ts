export interface SupplyControl {
  resourceId: number;
  resourceName: string;
  resourceUnit: string;
  budgetedQuantity: number;
  receivedQuantity: number;
  missingQuantity: number;
  status: 'OK' | 'PENDING' | 'EXCESS';
}
