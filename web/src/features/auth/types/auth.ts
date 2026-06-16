export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthUser {
  name: string;
  email: string;
}

export interface AuthResponse {
  user: AuthUser;
}
