const path = require("path");
const { loadEnvConfig } = require("@next/env");

const monorepoRoot = path.resolve(__dirname, "../..");
loadEnvConfig(monorepoRoot);
loadEnvConfig(__dirname);
