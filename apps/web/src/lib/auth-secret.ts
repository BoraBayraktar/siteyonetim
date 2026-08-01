import { loadMonorepoEnv, reloadMonorepoEnvIfNeeded } from "@/lib/monorepo-env";

export function assertAuthSecret(): string {
  loadMonorepoEnv();
  reloadMonorepoEnvIfNeeded();

  const secret = process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (secret) {
    return secret;
  }

  throw new Error(
    process.env.VERCEL === "1"
      ? "AUTH_SECRET is missing on Vercel. Project Settings → Environment Variables → add AUTH_SECRET (openssl rand -base64 32), then redeploy."
      : "AUTH_SECRET is missing. Copy .env.example to .env at the repo root and set AUTH_SECRET (openssl rand -base64 32), then restart npm run dev from the repo root.",
  );
}
