const fs = require("fs");
const path = require("path");
const { loadEnvConfig } = require("@next/env");

const repoRoot = path.resolve(__dirname, "../..");

/** Kök `.env` local Docker + AUTH_SECRET — shell'deki Neon/VERCEL pull değerlerini ezer. */
function applyRootEnvOverrides() {
  const envPath = path.join(repoRoot, ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }
  const content = fs.readFileSync(envPath, "utf8");
  for (const key of [
    "DATABASE_URL",
    "AUTH_SECRET",
    "CRON_SECRET",
    "SUPER_ADMIN_EMAIL",
    "SUPER_ADMIN_PASSWORD",
    "SUPER_ADMIN_NAME",
  ]) {
    const match = content.match(new RegExp(`^${key}="([^"]*)"`, "m"));
    if (match?.[1]) {
      process.env[key] = match[1];
    }
  }
}

if (process.env.VERCEL !== "1") {
  loadEnvConfig(repoRoot, true, { info() {}, error: console.error }, true);
  loadEnvConfig(__dirname, true, { info() {}, error: console.error }, true);
}

applyRootEnvOverrides();
