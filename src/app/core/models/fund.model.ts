export interface FundStatus {
  totalcontributions: string;
  totaldonations: string;
  availablefunds: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  details?: any;
}

