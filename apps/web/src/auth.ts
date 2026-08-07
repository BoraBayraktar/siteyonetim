import "./bootstrap-monorepo-env";

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "@/auth.config";
import { assertAuthSecret } from "@/lib/auth-secret";
import { getAuthService, getPropertyRbacService, getPropertyTenantService } from "@/lib/services";

async function enrichAdminSession(user: {
  id: string;
  email: string;
  name: string;
  sessionKind: "ADMIN";
  organizationId: string;
  organizationName: string;
  role: string | null;
  isSuperAdmin?: boolean;
}) {
  if (user.isSuperAdmin) {
    return {
      ...user,
      orgWideAccess: true,
      propertyAccess: [] as { propertyId: string; role: string }[],
      role: user.role ?? "ORG_ADMIN",
    };
  }

  const rbac = getPropertyRbacService();
  const scope = await rbac.resolveAccessiblePropertyIds({
    userId: user.id,
    organizationId: user.organizationId,
    organizationRole: user.role as import("@siteyonetim/db").OrganizationRole | null,
  });

  if (scope === "ALL") {
    return { ...user, orgWideAccess: true, propertyAccess: [] as { propertyId: string; role: string }[] };
  }

  const entries = await rbac.listPropertyAccess({
    userId: user.id,
    organizationId: user.organizationId,
    organizationRole: user.role as import("@siteyonetim/db").OrganizationRole | null,
  });

  return {
    ...user,
    orgWideAccess: false,
    propertyAccess: entries.map((entry) => ({ propertyId: entry.propertyId, role: entry.role })),
  };
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  secret: assertAuthSecret(),
  providers: [
    Credentials({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Remember Me", type: "text" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        const rememberMe = credentials?.rememberMe === "true";
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const user = await getAuthService().validateCredentials({
          email: email.trim().toLowerCase(),
          password,
        });
        if (!user) {
          return null;
        }

        if (user.sessionKind === "ADMIN") {
          if (!user.isSuperAdmin) {
            const totpStatus = await getAuthService().getTotpStatus(user.id, user.organizationId);
            if (totpStatus.enabled || totpStatus.organizationRequiresTwoFactor) {
              return null;
            }
          }

          return {
            ...(await enrichAdminSession({
              id: user.id,
              email: user.email,
              name: user.name,
              sessionKind: "ADMIN",
              organizationId: user.organizationId,
              organizationName: user.organizationName,
              role: user.role ?? null,
              isSuperAdmin: user.isSuperAdmin,
            })),
            rememberMe,
            isSuperAdmin: user.isSuperAdmin,
          };
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          sessionKind: user.sessionKind,
          organizationId: user.organizationId,
          organizationName: user.organizationName,
          role: user.role ?? null,
          portalAuthKind: "EMAIL" as const,
          rememberMe,
        };
      },
    }),
    Credentials({
      id: "login-bootstrap",
      name: "login-bootstrap",
      credentials: {
        bootstrapId: { label: "Bootstrap", type: "text" },
      },
      authorize: async (credentials) => {
        const bootstrapId = credentials?.bootstrapId;
        if (typeof bootstrapId !== "string") {
          return null;
        }

        const user = await getAuthService().consumeLoginBootstrap(bootstrapId);
        if (!user || user.sessionKind !== "ADMIN") {
          return null;
        }

        return {
          ...(await enrichAdminSession({
            id: user.id,
            email: user.email,
            name: user.name,
            sessionKind: "ADMIN",
            organizationId: user.organizationId,
            organizationName: user.organizationName,
            role: user.role ?? null,
            isSuperAdmin: user.isSuperAdmin,
          })),
          rememberMe: user.rememberMe,
          isSuperAdmin: user.isSuperAdmin,
        };
      },
    }),
    Credentials({
      id: "unit-credentials",
      name: "unit-credentials",
      credentials: {
        portalCode: { label: "Portal Code", type: "text" },
        blockName: { label: "Block", type: "text" },
        unitCode: { label: "Unit", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const portalCode = credentials?.portalCode;
        const blockName = credentials?.blockName;
        const unitCode = credentials?.unitCode;
        const password = credentials?.password;
        if (
          typeof portalCode !== "string" ||
          typeof unitCode !== "string" ||
          typeof password !== "string"
        ) {
          return null;
        }

        const tenantService = getPropertyTenantService();
        const validated = await tenantService.validateUnitCredential({
          portalCode,
          blockName: typeof blockName === "string" ? blockName : null,
          unitCode,
          password,
        });
        if (!validated) {
          return null;
        }

        await tenantService.touchUnitCredentialLogin(validated.credentialId);

        return {
          id: validated.credentialId,
          email: `${validated.unitCode}@${portalCode.trim().toLowerCase()}.portal.local`,
          name: validated.displayName,
          sessionKind: "PORTAL" as const,
          organizationId: validated.organizationId,
          organizationName: validated.propertyName,
          role: null,
          portalAuthKind: "UNIT" as const,
          propertyId: validated.propertyId,
          unitId: validated.unitId,
          credentialId: validated.credentialId,
        };
      },
    }),
  ],
});
