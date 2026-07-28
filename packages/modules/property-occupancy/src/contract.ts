import type { OccupancyRole } from "@siteyonetim/db";

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
  unitCode: string;
  propertyName: string;
  propertyAddress: string | null;
  blockName: string | null;
};

export interface OccupancyServiceContract {
  listByProperty(input: ListOccupanciesInput): Promise<PaginatedOccupancies>;
  assign(input: AssignOccupancyInput): Promise<OccupancyDto>;
  listForPortalUser(userId: string): Promise<PortalOccupancyDto[]>;
}
