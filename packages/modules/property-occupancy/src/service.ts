import { createAuditService } from "@siteyonetim/platform-audit";

import type {
  AssignOccupancyInput,
  EndOccupancyInput,
  GetUnitOccupancyDetailInput,
  ListOccupanciesInput,
  ListUnitBoardInput,
  OccupancyServiceContract,
  PaginatedOccupancies,
  PaginatedUnitBoard,
  PortalOccupancyDto,
  SetUnitRoleOccupancyInput,
  UnitOccupancyDetailDto,
  UpdateOccupancyInput,
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

  async listUnitBoard(input: ListUnitBoardInput): Promise<PaginatedUnitBoard> {
    const { rows, total } = await this.repository.listUnitBoard(input);
    return { items: rows, total, page: input.page, pageSize: input.pageSize };
  }

  async getUnitOccupancyDetail(input: GetUnitOccupancyDetailInput): Promise<UnitOccupancyDetailDto | null> {
    return this.repository.getUnitOccupancyDetail(input);
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

  async setUnitRoleOccupancy(input: SetUnitRoleOccupancyInput) {
    const result = await this.repository.setUnitRoleOccupancy(input);
    if (result === null && input.partyId) {
      throw new Error("UNIT_OR_PARTY_NOT_FOUND");
    }

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: input.partyId ? "occupancy.set_role" : "occupancy.clear_role",
      entityType: "Occupancy",
      entityId: result?.id ?? input.unitId,
      metadata: {
        unitId: input.unitId,
        partyId: input.partyId,
        role: input.role,
      },
    });

    return result;
  }

  async updateRole(input: UpdateOccupancyInput) {
    const updated = await this.repository.updateRole(input);
    if (!updated) {
      throw new Error("OCCUPANCY_NOT_FOUND");
    }

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "occupancy.update_role",
      entityType: "Occupancy",
      entityId: updated.id,
      metadata: { role: input.role },
    });

    return updated;
  }

  async end(input: EndOccupancyInput) {
    const ok = await this.repository.end(input);
    if (!ok) {
      throw new Error("OCCUPANCY_NOT_FOUND");
    }

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "occupancy.end",
      entityType: "Occupancy",
      entityId: input.occupancyId,
      metadata: { propertyId: input.propertyId },
    });
  }

  async listForPortalUser(userId: string): Promise<PortalOccupancyDto[]> {
    return this.repository.listForPortalUser(userId);
  }

  async listForPortalUnit(propertyId: string, unitId: string): Promise<PortalOccupancyDto[]> {
    return this.repository.listForPortalUnit(propertyId, unitId);
  }
}

export function createOccupancyService(): OccupancyService {
  return new OccupancyService();
}
