import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function resolveDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return undefined;
  }

  // Dev / Next hot reload: one connection per process to avoid Neon exhaustion.
  if (process.env.NODE_ENV === "production") {
    return url;
  }

  const separator = url.includes("?") ? "&" : "?";
  const suffixes: string[] = [];
  if (!/[?&]connection_limit=/.test(url)) {
    suffixes.push("connection_limit=1");
  }
  if (!/[?&]pool_timeout=/.test(url)) {
    suffixes.push("pool_timeout=20");
  }
  if (url.includes("-pooler") && !/[?&]pgbouncer=/.test(url)) {
    suffixes.push("pgbouncer=true");
  }
  if (suffixes.length === 0) {
    return url;
  }
  return `${url}${separator}${suffixes.join("&")}`;
}

function createPrismaClient(): PrismaClient {
  const url = resolveDatabaseUrl();
  return new PrismaClient({
    ...(url ? { datasources: { db: { url } } } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;

export * from "@prisma/client";
