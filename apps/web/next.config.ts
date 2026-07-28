import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import createNextIntlPlugin from "next-intl/plugin";
import path from "path";

// Monorepo: kök `.env` (npm run dev kökten çalışırken)
loadEnvConfig(path.resolve(process.cwd(), "../.."));

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: [
    "@siteyonetim/db",
    "@siteyonetim/platform-auth",
    "@siteyonetim/finance-dues",
    "@siteyonetim/finance-core",
    "@siteyonetim/property-core",
    "@siteyonetim/property-parties",
    "@siteyonetim/property-occupancy",
    "@siteyonetim/platform-audit",
    "@siteyonetim/platform-cache",
  ],
};

export default withNextIntl(nextConfig);
