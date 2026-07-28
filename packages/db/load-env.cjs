const path = require("path");
const { loadEnvConfig } = require("@next/env");

if (process.env.VERCEL === "1") {
  return;
}

loadEnvConfig(path.resolve(__dirname, "../.."));
loadEnvConfig(__dirname);
