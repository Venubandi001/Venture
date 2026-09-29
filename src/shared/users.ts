// Staff account types (no server code — safe to import from the browser).
export type Role = "admin" | "sales";

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  mustChangePassword: boolean;
}

export const PASSWORD_MIN = 10;
