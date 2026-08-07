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

const envLog = {
  info: () => {},
  error: (...args: unknown[]) => console.error(...args),
};

const isDev = process.env.NODE_ENV !== "production";

function envSearchDirs(): string[] {
  const webRoot = getWebAppRoot();
  const repoRoot = getMonorepoRoot();
  return [...new Set([repoRoot, webRoot, process.cwd()])];
}

function loadEnvDirs(forceReload: boolean): void {
  for (const dir of envSearchDirs()) {
    loadEnvConfig(dir, isDev, envLog, forceReload);
  }
}

/** @next/env skips re-load when __NEXT_PROCESSED_ENV is set; read disk as last resort. */
function hydrateAuthSecretsFromDisk(): void {
  if (process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim()) {
    return;
  }

  const envFiles = [".env.development.local", ".env.local", ".env.development", ".env"];
  for (const dir of envSearchDirs()) {
    for (const file of envFiles) {
      const filePath = path.join(dir, file);
      if (!fs.existsSync(filePath)) {
        continue;
      }
      try {
        const content = fs.readFileSync(filePath, "utf8");
        for (const key of ["AUTH_SECRET", "NEXTAUTH_SECRET"] as const) {
          const match = content.match(new RegExp(`^${key}\\s*=\\s*(.+)$`, "m"));
          if (!match) {
            continue;
          }
          let value = match[1]?.trim() ?? "";
          if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
          ) {
            value = value.slice(1, -1);
          }
          if (value) {
            process.env.AUTH_SECRET = value;
            return;
          }
        }
      } catch {
        /* ignore unreadable env files */
      }
    }
  }
}

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

  loadEnvDirs(false);

  // Turbopack workers may process apps/web/.env.local first (no AUTH_SECRET) and set
  // __NEXT_PROCESSED_ENV, which makes later @next/env calls a no-op.
  if (!process.env.AUTH_SECRET?.trim() && !process.env.NEXTAUTH_SECRET?.trim()) {
    loadEnvDirs(true);
    hydrateAuthSecretsFromDisk();
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
