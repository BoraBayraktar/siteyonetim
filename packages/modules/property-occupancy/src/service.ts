import { createAuditService } from "@siteyonetim/platform-audit";

import type {
  AssignOccupancyInput,
  ListOccupanciesInput,
  OccupancyServiceContract,
  PaginatedOccupancies,
  PortalOccupancyDto,
} from "./contract";
import { OccupancyRepository } from "./repository";

export class OccupancyService implements OccupancyServiceContract {
  constructor(
    private readonly repository = new OccupancyRepository(),
    private readonly audit = createAuditService(),
  ) {}

  async listByProperty(input: ListOccupanciesInput): Promise<PaginatedOccupancies> {
    const { rows, total } = await this.repository.listByProperty(input);
    return { items: rows, total, page: input.page, pageSize: input.pageSize };
  }

  async assign(input: AssignOccupancyInput) {
    const created = await this.repository.assign(input);
    if (!created) {
      throw new Error("UNIT_OR_PARTY_NOT_FOUND");
    }

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "occupancy.assign",
      entityType: "Occupancy",
      entityId: created.id,
      metadata: {
        unitId: input.unitId,
        partyId: input.partyId,
        role: input.role,
      },
    });

    return created;
  }

  async listForPortalUser(userId: string): Promise<PortalOccupancyDto[]> {
    return this.repository.listForPortalUser(userId);
  }
}

export function createOccupancyService(): OccupancyService {
  return new OccupancyService();
}
