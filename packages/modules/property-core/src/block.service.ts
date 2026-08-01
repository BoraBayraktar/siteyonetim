import { createAuditService } from "@siteyonetim/platform-audit";
import { invalidateCachePrefix } from "@siteyonetim/platform-cache";

import { BlockRepository } from "./block.repository";
import type {
  BlockServiceContract,
  CreateBlockInput,
  DeleteBlockInput,
  ListBlocksInput,
  PaginatedBlocks,
  UpdateBlockInput,
} from "./contract";

const CACHE_PREFIX = "block:list:";

export class BlockService implements BlockServiceContract {
  constructor(
    private readonly repository = new BlockRepository(),
    private readonly audit = createAuditService(),
  ) {}

  async list(input: ListBlocksInput): Promise<PaginatedBlocks> {
    const { rows, total } = await this.repository.listPaginated(input);
    return {
      items: rows,
      total,
      page: input.page,
      pageSize: input.pageSize,
    };
  }

  async create(input: CreateBlockInput) {
    const name = input.name.trim();
    if (!name) {
      throw new Error("BLOCK_NAME_REQUIRED");
    }

    const created = await this.repository.create({ ...input, name });
    if (!created) {
      throw new Error("PROPERTY_NOT_FOUND");
    }

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "block.create",
      entityType: "Block",
      entityId: created.id,
      metadata: { propertyId: input.propertyId, name },
    });

    await invalidateCachePrefix(`${CACHE_PREFIX}${input.propertyId}:`);
    return created;
  }

  async update(input: UpdateBlockInput) {
    const name = input.name.trim();
    if (!name) {
      throw new Error("BLOCK_NAME_REQUIRED");
    }

    try {
      const updated = await this.repository.update({ ...input, name });
      if (!updated) {
        throw new Error("BLOCK_NOT_FOUND");
      }

      await this.audit.record({
        organizationId: input.organizationId,
        userId: input.actorUserId,
        action: "block.update",
        entityType: "Block",
        entityId: updated.id,
        metadata: { propertyId: input.propertyId, name },
      });

      await invalidateCachePrefix(`${CACHE_PREFIX}${input.propertyId}:`);
      return updated;
    } catch (err) {
      if (err instanceof Error && err.message === "BLOCK_NOT_FOUND") {
        throw err;
      }
      if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002") {
        throw new Error("BLOCK_NAME_EXISTS");
      }
      throw err;
    }
  }

  async delete(input: DeleteBlockInput) {
    const result = await this.repository.softDelete(input);
    if (result === "not_found") {
      throw new Error("BLOCK_NOT_FOUND");
    }
    if (result === "has_units") {
      throw new Error("BLOCK_HAS_UNITS");
    }

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "block.delete",
      entityType: "Block",
      entityId: input.blockId,
      metadata: { propertyId: input.propertyId },
    });

    await invalidateCachePrefix(`${CACHE_PREFIX}${input.propertyId}:`);
    await invalidateCachePrefix("property:list:");
  }
}

export function createBlockService(): BlockService {
  return new BlockService();
}
