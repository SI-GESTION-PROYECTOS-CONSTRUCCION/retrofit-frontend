export enum TransactionType {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND'
}

export enum TransactionReason {
  INITIAL_BALANCE = 'INITIAL_BALANCE',
  PURCHASE = 'PURCHASE',
  CONSUMPTION = 'CONSUMPTION',
  LOSS = 'LOSS'
}


export interface InventoryTransactionRequest {
  projectId: number;
  resourceId: number;
  projectItemId?: number | null; 
  reason: TransactionReason;
  quantity: number;
  referenceDocument?: string;
  observations?: string;
  createdBy: string;
}


export interface InventoryTransactionResponse {
  id: number;
  projectId: number;
  projectName: string;
  resourceId: number;
  resourceName: string;
  resourceUnit: string;
  projectItemId?: number;
  projectItemCode?: string;
  transactionType: TransactionType;
  reason: TransactionReason;
  quantity: number;
  referenceDocument: string;
  transactionDate: string;
  createdBy: string;
  observations: string;
}

export interface StockSummary {
  projectId: number;
  resourceId: number;
  resourceName: string;
  resourceUnit: string;
  currentStock: number;
}