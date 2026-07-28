import { prisma, type Prisma } from "@siteyonetim/db";

import type { AuditRecordInput } from "./contract";

export class AuditRepository {
  async create(input: AuditRecordInput): Promise<void> {
    const metadata = (input.metadata ?? {}) as Prisma.InputJsonValue;
    await prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata,
      },
    });
  }
}
