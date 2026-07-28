const path = require("path");
const { loadEnvConfig } = require("@next/env");

if (process.env.VERCEL === "1") {
  return;
}

const monorepoRoot = path.resolve(__dirname, "../..");
loadEnvConfig(monorepoRoot);
loadEnvConfig(__dirname);
