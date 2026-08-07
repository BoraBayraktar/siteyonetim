import { DefaultSession } from "next-auth";

export type PropertyAccessClaim = {
  propertyId: string;
  role: string;
};

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      sessionKind: "ADMIN" | "PORTAL";
      organizationId: string;
      organizationName: string;
      role: string | null;
      orgWideAccess?: boolean;
      isSuperAdmin?: boolean;
      propertyAccess?: PropertyAccessClaim[];
      portalAuthKind?: "EMAIL" | "UNIT";
      propertyId?: string;
      unitId?: string;
      credentialId?: string;
    };
  }

  interface User {
    sessionKind: "ADMIN" | "PORTAL";
    organizationId: string;
    organizationName: string;
    role: string | null;
    orgWideAccess?: boolean;
    isSuperAdmin?: boolean;
    propertyAccess?: PropertyAccessClaim[];
    portalAuthKind?: "EMAIL" | "UNIT";
    propertyId?: string;
    unitId?: string;
    credentialId?: string;
    rememberMe?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sessionKind?: "ADMIN" | "PORTAL";
    organizationId?: string;
    organizationName?: string;
    role?: string | null;
    orgWideAccess?: boolean;
    isSuperAdmin?: boolean;
    propertyAccess?: PropertyAccessClaim[];
    portalAuthKind?: "EMAIL" | "UNIT";
    propertyId?: string;
    unitId?: string;
    credentialId?: string;
    rememberMe?: boolean;
    sessionMaxAge?: number;
    /** Unix seconds; absolute session end (remember-me aware). */
    absoluteExp?: number;
  }
}
