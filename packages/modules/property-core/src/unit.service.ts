import { createAuditService } from "@siteyonetim/platform-audit";
import { invalidateCachePrefix } from "@siteyonetim/platform-cache";

import type { CreateUnitInput, ListUnitsInput, PaginatedUnits, UnitServiceContract } from "./contract";
import { UnitRepository } from "./unit.repository";

const CACHE_PREFIX = "unit:list:";

export class UnitService implements UnitServiceContract {
  constructor(
    private readonly repository = new UnitRepository(),
    private readonly audit = createAuditService(),
  ) {}

  async list(input: ListUnitsInput): Promise<PaginatedUnits> {
    const { rows, total } = await this.repository.listPaginated(input);
    return {
      items: rows,
      total,
      page: input.page,
      pageSize: input.pageSize,
    };
  }

  async create(input: CreateUnitInput) {
    const code = input.code.trim();
    if (!code) {
      throw new Error("UNIT_CODE_REQUIRED");
    }

    const created = await this.repository.create({ ...input, code });
    if (!created) {
      throw new Error("PROPERTY_OR_BLOCK_NOT_FOUND");
    }

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "unit.create",
      entityType: "Unit",
      entityId: created.id,
      metadata: { propertyId: input.propertyId, code },
    });

    await invalidateCachePrefix(`${CACHE_PREFIX}${input.propertyId}:`);
    await invalidateCachePrefix("property:list:");
    return created;
  }
}

export function createUnitService(): UnitService {
  return new UnitService();
}
