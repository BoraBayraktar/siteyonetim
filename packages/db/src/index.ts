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

function isPrismaClientCurrent(client: PrismaClient): boolean {
  return "userUiPreference" in client;
}

function getPrismaClient(): PrismaClient {
  const existing = globalForPrisma.prisma;
  if (existing && isPrismaClientCurrent(existing)) {
    return existing;
  }

  const client = createPrismaClient();
  globalForPrisma.prisma = client;
  return client;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    if (prop === "then") {
      return undefined;
    }
    const client = getPrismaClient();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export * from "@prisma/client";
