export interface Contribution {
  contributionid: number;
  memberid: number;
  amount: string;
  contributeddate: string;
  createdat: string;
}

export interface CreateContributionRequest {
  memberId: number;
  amount: number;
  contributedDate: string;
}

export interface ContributionsResponse {
  contributions: Contribution[];
}

