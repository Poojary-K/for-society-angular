export interface User {
  memberId: number;
  name: string;
  email: string | null;
  phone: string | null;
  joinedOn: string;
  isAdmin: boolean;
}

export interface AuthTokenPayload {
  memberId: number;
  email: string;
  isAdmin?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  adminSecretCode?: string;
}

export interface LoginResponse {
  token: string;
  member: User;
}

export interface RegisterResponse {
  memberId: number;
  name: string;
  email: string | null;
  phone: string | null;
  joinedOn: string;
  isAdmin: boolean;
  token: string;
}

export interface UpgradeToAdminRequest {
  adminSecretCode: string;
}

export interface UpgradeToAdminResponse {
  token: string;
  member: User;
}

