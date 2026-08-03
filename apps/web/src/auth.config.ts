import type { NextAuthConfig } from "next-auth";
import { encode as encodeJwt, decode as decodeJwt } from "next-auth/jwt";
import {
  resolveSessionMaxAgeSeconds,
  SESSION_MAX_AGE_REMEMBER_SECONDS,
} from "@siteyonetim/platform-auth";

function remainingSessionSeconds(token: { absoluteExp?: number; sessionMaxAge?: number } | null | undefined, fallback: number) {
  if (typeof token?.absoluteExp === "number") {
    return Math.max(0, token.absoluteExp - Math.floor(Date.now() / 1000));
  }
  if (typeof token?.sessionMaxAge === "number") {
    return token.sessionMaxAge;
  }
  return fallback;
}

export const authConfig = {
  trustHost: true,
  // Cookie ceiling must cover the longest ("remember me") session. Shorter
  // sessions are enforced via absoluteExp on the JWT (Auth.js encode ignores token.exp).
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_REMEMBER_SECONDS },
  pages: {
    signIn: "/tr/login",
  },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  providers: [],
  jwt: {
    decode: decodeJwt,
    async encode(params) {
      const maxAge = remainingSessionSeconds(params.token, params.maxAge ?? SESSION_MAX_AGE_REMEMBER_SECONDS);
      return encodeJwt({ ...params, maxAge });
    },
  },
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
        token.rememberMe = rememberMe;
        token.sessionMaxAge = maxAge;
        token.absoluteExp = Math.floor(Date.now() / 1000) + maxAge;
      }

      if (typeof token.absoluteExp === "number" && Math.floor(Date.now() / 1000) >= token.absoluteExp) {
        return null;
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
      if (typeof token.absoluteExp === "number") {
        session.expires = new Date(token.absoluteExp * 1000).toISOString() as typeof session.expires;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
