import { loadEnvConfig } from "@next/env";
import path from "path";

function tryLoadMonorepoEnv(): void {
  if (process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET) {
    return;
  }
  if (process.env.VERCEL === "1") {
    return;
  }

  const dirs = new Set<string>([
    path.resolve(process.cwd(), "../.."),
    path.resolve(process.cwd(), ".."),
    process.cwd(),
  ]);

  for (const dir of dirs) {
    loadEnvConfig(dir);
    if (process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET) {
      return;
    }
  }
}

export function assertAuthSecret(): string {
  tryLoadMonorepoEnv();

  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (secret) {
    return secret;
  }

  throw new Error(
    process.env.VERCEL === "1"
      ? "AUTH_SECRET is missing on Vercel. Project Settings → Environment Variables → add AUTH_SECRET (openssl rand -base64 32), then redeploy."
      : "AUTH_SECRET is missing. Copy .env.example to .env at the repo root and set AUTH_SECRET (openssl rand -base64 32), then restart npm run dev from the repo root.",
  );
}
