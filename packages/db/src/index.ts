import { DueCalculationMode, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function runtimeEnumValueCount(client: PrismaClient, enumName: string): number | undefined {
  const runtime = (
    client as unknown as { _runtimeDataModel?: { enums?: Record<string, { values: unknown[] }> } }
  )._runtimeDataModel;
  return runtime?.enums?.[enumName]?.values?.length;
}

function hasModelField(client: PrismaClient, modelName: string, fieldName: string): boolean | undefined {
  const runtime = (
    client as unknown as {
      _runtimeDataModel?: { models?: Record<string, { fields?: { name: string }[] }> };
    }
  )._runtimeDataModel;
  const fields = runtime?.models?.[modelName]?.fields;
  if (!fields) {
    return undefined;
  }
  return fields.some((field) => field.name === fieldName);
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function runtimeModelNames(client: PrismaClient): string[] | undefined {
  const runtime = (
    client as unknown as { _runtimeDataModel?: { models?: Record<string, unknown> } }
  )._runtimeDataModel;
  if (!runtime?.models) return undefined;
  return Object.keys(runtime.models);
}

function isStalePrismaClient(client: PrismaClient): boolean {
  const cachedDueModes = runtimeEnumValueCount(client, "DueCalculationMode");
  if (DueCalculationMode) {
    const expectedDueModes = Object.keys(DueCalculationMode).length;
    if (cachedDueModes !== undefined && cachedDueModes !== expectedDueModes) {
      return true;
    }
  }

  const hasAnnouncementBodyFormat = hasModelField(client, "Announcement", "bodyFormat");
  if (hasAnnouncementBodyFormat === false) {
    return true;
  }

  const hasPublishStartAt = hasModelField(client, "Announcement", "publishStartAt");
  if (hasPublishStartAt === false) {
    return true;
  }

  const models = runtimeModelNames(client);
  if (models && !models.includes("PropertyTenant")) {
    return true;
  }
  if (models && !models.includes("PasswordResetToken")) {
    return true;
  }

  const tenantDelegate = (client as unknown as { propertyTenant?: { findFirst?: unknown } }).propertyTenant;
  const resetDelegate = (client as unknown as { passwordResetToken?: { findFirst?: unknown } }).passwordResetToken;
  return tenantDelegate?.findFirst === undefined || resetDelegate?.findFirst === undefined;
}

function getPrismaClient(): PrismaClient {
  let client = globalForPrisma.prisma;

  if (client && isStalePrismaClient(client)) {
    void client.$disconnect().catch(() => undefined);
    client = undefined;
    globalForPrisma.prisma = undefined;
  }

  if (!client) {
    client = createPrismaClient();
    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.prisma = client;
    }
  }

  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

export * from "@prisma/client";
