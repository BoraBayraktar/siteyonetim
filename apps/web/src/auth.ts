import "./bootstrap-monorepo-env";

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "@/auth.config";
import { assertAuthSecret } from "@/lib/auth-secret";
import { getAuthService } from "@/lib/services";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  secret: assertAuthSecret(),
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
});
