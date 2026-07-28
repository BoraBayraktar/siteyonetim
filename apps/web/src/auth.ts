import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { getAuthService } from "@/lib/services";

const authSecret = process.env.AUTH_SECRET;

if (!authSecret) {
  throw new Error(
    "AUTH_SECRET is missing. Copy .env.example to .env at the repo root and set AUTH_SECRET (openssl rand -base64 32).",
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: authSecret,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/tr/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
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

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          sessionKind: user.sessionKind,
          organizationId: user.organizationId,
          organizationName: user.organizationName,
          role: user.role ?? null,
        };
      },
    }),
  ],
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
});
