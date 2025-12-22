export interface Member {
  memberid: number;
  name: string;
  email: string | null;
  phone: string | null;
  password: string;
  joinedon: string;
  is_admin?: boolean;
}

export interface MembersResponse {
  members: Member[];
}

