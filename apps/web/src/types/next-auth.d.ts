import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      sessionKind: "ADMIN" | "PORTAL";
      organizationId: string;
      organizationName: string;
      role: string | null;
    };
  }

  interface User {
    sessionKind: "ADMIN" | "PORTAL";
    organizationId: string;
    organizationName: string;
    role: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sessionKind?: "ADMIN" | "PORTAL";
    organizationId?: string;
    organizationName?: string;
    role?: string | null;
  }
}
