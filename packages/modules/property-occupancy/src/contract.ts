import type { OccupancyRole } from "@siteyonetim/db";

export type OccupancySlotDto = {
  occupancyId: string;
  partyId: string;
  partyName: string;
};

export type UnitOccupancyBoardRowDto = {
  unitId: string;
  propertyId: string;
  blockId: string | null;
  blockName: string | null;
  code: string;
  floor: number | null;
  areaM2: string | null;
  shareRatio: string | null;
  owner: OccupancySlotDto | null;
  tenant: OccupancySlotDto | null;
  occupancyStatus: "EMPTY" | "PARTIAL" | "FULL";
};

export type OccupancyHistoryDto = {
  id: string;
  partyId: string;
  partyName: string;
  role: OccupancyRole;
  startDate: Date;
  endDate: Date;
};

export type UnitOccupancyDetailDto = {
  unitId: string;
  propertyId: string;
  blockId: string | null;
  blockName: string | null;
  code: string;
  floor: number | null;
  areaM2: string | null;
  shareRatio: string | null;
  owner: OccupancySlotDto | null;
  tenant: OccupancySlotDto | null;
  history: OccupancyHistoryDto[];
};

export type OccupancyDto = {
  id: string;
  unitId: string;
  unitCode: string;
  propertyId: string;
  propertyName: string;
  partyId: string;
  partyName: string;
  role: OccupancyRole;
  startDate: Date;
};

export type AssignOccupancyInput = {
  organizationId: string;
  propertyId: string;
  unitId: string;
  partyId: string;
  role: OccupancyRole;
  actorUserId?: string | null;
};

export type ListOccupanciesInput = {
  organizationId: string;
  propertyId: string;
  page: number;
  pageSize: number;
};

export type PaginatedOccupancies = {
  items: OccupancyDto[];
  total: number;
  page: number;
  pageSize: number;
};

export type PortalOccupancyDto = {
  occupancyId: string;
  role: OccupancyRole;
  propertyId: string;
  unitId: string;
  blockId: string | null;
  unitCode: string;
  propertyName: string;
  propertyAddress: string | null;
  blockName: string | null;
};

export type UpdateOccupancyInput = {
  organizationId: string;
  propertyId: string;
  occupancyId: string;
  role: OccupancyRole;
  actorUserId?: string | null;
};

export type EndOccupancyInput = {
  organizationId: string;
  propertyId: string;
  occupancyId: string;
  actorUserId?: string | null;
};

export type ListUnitBoardInput = {
  organizationId: string;
  propertyId: string;
  page: number;
  pageSize: number;
  blockId?: string | null;
  unassignedOnly?: boolean;
};

export type PaginatedUnitBoard = {
  items: UnitOccupancyBoardRowDto[];
  total: number;
  page: number;
  pageSize: number;
};

export type GetUnitOccupancyDetailInput = {
  organizationId: string;
  propertyId: string;
  unitId: string;
};

export type SetUnitRoleOccupancyInput = {
  organizationId: string;
  propertyId: string;
  unitId: string;
  role: OccupancyRole;
  partyId: string | null;
  actorUserId?: string | null;
};

export interface OccupancyServiceContract {
  listByProperty(input: ListOccupanciesInput): Promise<PaginatedOccupancies>;
  listUnitBoard(input: ListUnitBoardInput): Promise<PaginatedUnitBoard>;
  getUnitOccupancyDetail(input: GetUnitOccupancyDetailInput): Promise<UnitOccupancyDetailDto | null>;
  assign(input: AssignOccupancyInput): Promise<OccupancyDto>;
  setUnitRoleOccupancy(input: SetUnitRoleOccupancyInput): Promise<OccupancyDto | null>;
  updateRole(input: UpdateOccupancyInput): Promise<OccupancyDto>;
  end(input: EndOccupancyInput): Promise<void>;
  listForPortalUser(userId: string): Promise<PortalOccupancyDto[]>;
  listForPortalUnit(propertyId: string, unitId: string): Promise<PortalOccupancyDto[]>;
}
