import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import createNextIntlPlugin from "next-intl/plugin";
import path from "path";
import { fileURLToPath } from "url";

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(webRoot, "../..");
loadEnvConfig(monorepoRoot);
loadEnvConfig(webRoot);

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: [
    "@siteyonetim/db",
    "@siteyonetim/platform-auth",
    "@siteyonetim/platform-rbac",
    "@siteyonetim/platform-tenant",
    "@siteyonetim/finance-dues",
    "@siteyonetim/finance-core",
    "@siteyonetim/property-core",
    "@siteyonetim/property-parties",
    "@siteyonetim/property-occupancy",
    "@siteyonetim/comm-announcements",
    "@siteyonetim/comm-notifications",
    "@siteyonetim/document-management",
    "@siteyonetim/property-settings",
    "@siteyonetim/property-meters",
    "@siteyonetim/reporting-standard",
    "@siteyonetim/reporting-core",
    "@siteyonetim/platform-files",
    "@siteyonetim/platform-audit",
    "@siteyonetim/platform-cache",
    "@siteyonetim/platform-jobs",
  ],
};

export default withNextIntl(nextConfig);
