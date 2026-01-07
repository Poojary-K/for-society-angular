export interface Member {
  memberid: number;
  name: string;
  email: string | null;
  phone: string | null;
  password: string;
  joinedon: string;
  is_admin?: boolean;
  email_verified?: boolean;
  email_verified_at?: string | null;
}

export interface MembersResponse {
  members: Member[];
}
