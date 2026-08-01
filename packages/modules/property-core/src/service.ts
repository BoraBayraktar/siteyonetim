import { createAuditService } from "@siteyonetim/platform-audit";
import { getCacheClient, invalidateCachePrefix } from "@siteyonetim/platform-cache";

import type {
  CreatePropertyInput,
  ListPropertiesInput,
  PaginatedProperties,
  PropertyServiceContract,
} from "./contract";
import { PropertyRepository } from "./repository";

const CACHE_PREFIX = "property:list:";

function listCacheKey(input: ListPropertiesInput): string {
  return `${CACHE_PREFIX}${input.organizationId}:${input.page}:${input.pageSize}`;
}

export class PropertyService implements PropertyServiceContract {
  constructor(
    private readonly repository = new PropertyRepository(),
    private readonly audit = createAuditService(),
    private readonly cache = getCacheClient(),
  ) {}

  async list(input: ListPropertiesInput): Promise<PaginatedProperties> {
    const cacheKey = listCacheKey(input);
    const cached = await this.cache.get<PaginatedProperties>(cacheKey);
    if (cached) {
      return cached;
    }

    const { rows, total } = await this.repository.listPaginated(input);
    const result: PaginatedProperties = {
      items: rows,
      total,
      page: input.page,
      pageSize: input.pageSize,
    };

    await this.cache.set(cacheKey, result, 60);
    return result;
  }

  async create(input: CreatePropertyInput): Promise<import("./contract").PropertyDto> {
    const name = input.name.trim();
    if (!name) {
      throw new Error("PROPERTY_NAME_REQUIRED");
    }

    const created = await this.repository.create({
      ...input,
      name,
    });

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "property.create",
      entityType: "Property",
      entityId: created.id,
      metadata: { kind: created.kind, name: created.name },
    });

    await invalidateCachePrefix(`${CACHE_PREFIX}${input.organizationId}:`);

    return created;
  }

  async getById(organizationId: string, propertyId: string): Promise<import("./contract").PropertyDto | null> {
    return this.repository.getById(organizationId, propertyId);
  }

  async getShowcaseProperty(): Promise<import("./contract").PropertyDto | null> {
    const configuredId = process.env.HOME_SHOWCASE_PROPERTY_ID?.trim();
    if (configuredId) {
      return this.repository.findByIdAny(configuredId);
    }
    return this.repository.findShowcaseProperty();
  }
}

export function createPropertyService(): PropertyService {
  return new PropertyService();
}
