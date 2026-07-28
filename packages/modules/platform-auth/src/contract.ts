import type { OrganizationRole } from "@siteyonetim/db";

export type SessionKind = "ADMIN" | "PORTAL";

export type AuthUserDto = {
  id: string;
  email: string;
  name: string;
  sessionKind: SessionKind;
  organizationId: string;
  organizationName: string;
  role?: OrganizationRole;
};

export type ValidateCredentialsInput = {
  email: string;
  password: string;
};

export interface AuthServiceContract {
  validateCredentials(input: ValidateCredentialsInput): Promise<AuthUserDto | null>;
  findUserById(userId: string): Promise<AuthUserDto | null>;
}
