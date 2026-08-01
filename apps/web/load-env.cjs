const path = require("path");
const { loadEnvConfig } = require("@next/env");

if (process.env.VERCEL === "1") {
  return;
}

const webRoot = __dirname;
const repoRoot = path.resolve(webRoot, "../..");

for (const dir of [repoRoot, webRoot]) {
  loadEnvConfig(dir);
}
