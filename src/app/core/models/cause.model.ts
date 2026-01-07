export interface Cause {
  causeid: number;
  title: string;
  description: string | null;
  amount: string | null;
  createdat: string;
}

export interface CreateCauseRequest {
  title: string;
  description?: string;
  amount?: number;
  createdat?: string;
}

export interface CausesResponse {
  causes: Cause[];
}
