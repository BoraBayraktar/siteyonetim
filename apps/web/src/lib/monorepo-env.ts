import { loadEnvConfig } from "@next/env";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WEB_PACKAGE = "@siteyonetim/web";

function readPackageName(dir: string): string | null {
  const pkgPath = path.join(dir, "package.json");
  if (!fs.existsSync(pkgPath)) {
    return null;
  }
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { name?: string };
    return pkg.name ?? null;
  } catch {
    return null;
  }
}

function findWebAppRootFrom(startDir: string): string | null {
  let dir = path.resolve(startDir);
  for (let i = 0; i < 12; i += 1) {
    if (readPackageName(dir) === WEB_PACKAGE) {
      return dir;
    }
    const nested = path.join(dir, "apps/web");
    if (readPackageName(nested) === WEB_PACKAGE) {
      return nested;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return null;
}

function resolveWebAppRoot(): string {
  const candidates = [process.cwd()];
  try {
    candidates.push(path.dirname(fileURLToPath(import.meta.url)));
  } catch {
    /* bundled without file URL */
  }

  for (const start of candidates) {
    const found = findWebAppRootFrom(start);
    if (found) {
      return found;
    }
  }

  return path.resolve(process.cwd(), "apps/web");
}

let cachedWebRoot: string | null = null;
let cachedRepoRoot: string | null = null;
let loaded = false;

/** `apps/web` */
export function getWebAppRoot(): string {
  if (!cachedWebRoot) {
    cachedWebRoot = resolveWebAppRoot();
  }
  return cachedWebRoot;
}

/** Monorepo kökü (`siteyonetim/`) */
export function getMonorepoRoot(): string {
  if (!cachedRepoRoot) {
    cachedRepoRoot = path.resolve(getWebAppRoot(), "../..");
  }
  return cachedRepoRoot;
}

/**
 * Kök `.env` + `apps/web/.env*` — cwd ve Turbopack bundle konumundan bağımsız.
 */
export function loadMonorepoEnv(): void {
  if (loaded) return;
  if (process.env.VERCEL === "1") {
    loaded = true;
    return;
  }

  const webRoot = getWebAppRoot();
  const repoRoot = getMonorepoRoot();

  for (const dir of [repoRoot, webRoot, process.cwd()]) {
    loadEnvConfig(dir);
  }

  loaded = true;
}

/** Yanlış cwd ile ilk yükleme boş kaldıysa bir kez daha dene (dev hot reload). */
export function reloadMonorepoEnvIfNeeded(): void {
  if (process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim()) {
    return;
  }
  loaded = false;
  cachedWebRoot = null;
  cachedRepoRoot = null;
  loadMonorepoEnv();
}
