export type UserRole = "admin" | "user";
export type UserStatus = "active" | "disabled";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface AuthUserWithPassword extends AuthUser {
  passwordHash: string;
}

export interface AuthTokenPayload {
  sub: string;
  username: string;
  role: UserRole;
  email: string;
  iat: number;
  exp: number;
}
