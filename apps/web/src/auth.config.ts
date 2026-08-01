import type { NextAuthConfig } from "next-auth";

const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
const SESSION_MAX_AGE_REMEMBER_SECONDS = 30 * 24 * 60 * 60;

function resolveSessionMaxAgeSeconds(rememberMe: boolean): number {
  return rememberMe ? SESSION_MAX_AGE_REMEMBER_SECONDS : SESSION_MAX_AGE_SECONDS;
}

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
  pages: {
    signIn: "/tr/login",
  },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sessionKind = user.sessionKind;
        token.organizationId = user.organizationId;
        token.organizationName = user.organizationName;
        token.role = user.role;
        token.orgWideAccess = user.orgWideAccess;
        token.propertyAccess = user.propertyAccess;
        token.portalAuthKind = user.portalAuthKind;
        token.propertyId = user.propertyId;
        token.unitId = user.unitId;
        token.credentialId = user.credentialId;

        const rememberMe = user.rememberMe === true;
        const maxAge = resolveSessionMaxAgeSeconds(rememberMe);
        token.sessionMaxAge = maxAge;
        token.exp = Math.floor(Date.now() / 1000) + maxAge;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.sessionKind = token.sessionKind as "ADMIN" | "PORTAL";
        session.user.organizationId = token.organizationId as string;
        session.user.organizationName = token.organizationName as string;
        session.user.role = (token.role as string | null) ?? null;
        session.user.orgWideAccess = token.orgWideAccess as boolean | undefined;
        session.user.propertyAccess = token.propertyAccess as
          | { propertyId: string; role: string }[]
          | undefined;
        session.user.portalAuthKind = token.portalAuthKind as "EMAIL" | "UNIT" | undefined;
        session.user.propertyId = token.propertyId as string | undefined;
        session.user.unitId = token.unitId as string | undefined;
        session.user.credentialId = token.credentialId as string | undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
