import { createAuditService } from "@siteyonetim/platform-audit";
import { invalidateCachePrefix } from "@siteyonetim/platform-cache";

import { BlockRepository } from "./block.repository";
import type { BlockServiceContract, CreateBlockInput, ListBlocksInput, PaginatedBlocks } from "./contract";

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
}

export function createBlockService(): BlockService {
  return new BlockService();
}
