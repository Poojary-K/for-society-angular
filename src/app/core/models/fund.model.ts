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
  /** Present when the main resource was saved but a secondary step (e.g. image upload) failed */
  warnings?: string[];
}

