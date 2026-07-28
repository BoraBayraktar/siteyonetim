import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
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
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
