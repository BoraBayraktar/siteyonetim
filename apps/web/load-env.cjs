const fs = require("fs");
const path = require("path");
const { loadEnvConfig } = require("@next/env");

const webRoot = __dirname;
const repoRoot = path.resolve(webRoot, "../..");

/** Kök `.env` local Docker + AUTH_SECRET — shell'deki Neon/VERCEL pull değerlerini ezer. */
function applyRootEnvOverrides() {
  const envPath = path.join(repoRoot, ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }
  const content = fs.readFileSync(envPath, "utf8");
  for (const key of ["DATABASE_URL", "AUTH_SECRET", "CRON_SECRET"]) {
    const match = content.match(new RegExp(`^${key}="([^"]*)"`, "m"));
    if (match?.[1]) {
      process.env[key] = match[1];
    }
  }
}

if (process.env.VERCEL !== "1") {
  for (const dir of [repoRoot, webRoot]) {
    loadEnvConfig(dir, true, { info() {}, error: console.error }, true);
  }
}

applyRootEnvOverrides();
