import type { PropertyKind } from "@siteyonetim/db";

export type PropertyDto = {
  id: string;
  organizationId: string;
  kind: PropertyKind;
  name: string;
  address: string | null;
  blockCount: number;
  unitCount: number;
  createdAt: Date;
};

export type CreatePropertyInput = {
  organizationId: string;
  kind: PropertyKind;
  name: string;
  address?: string | null;
  actorUserId?: string | null;
};

export type ListPropertiesInput = {
  organizationId: string;
  page: number;
  pageSize: number;
};

export type PaginatedProperties = {
  items: PropertyDto[];
  total: number;
  page: number;
  pageSize: number;
};

export interface PropertyServiceContract {
  list(input: ListPropertiesInput): Promise<PaginatedProperties>;
  create(input: CreatePropertyInput): Promise<PropertyDto>;
  getById(organizationId: string, propertyId: string): Promise<PropertyDto | null>;
}

export type BlockDto = {
  id: string;
  propertyId: string;
  name: string;
  sortOrder: number;
  unitCount: number;
};

export type CreateBlockInput = {
  organizationId: string;
  propertyId: string;
  name: string;
  sortOrder?: number;
  actorUserId?: string | null;
};

export type ListBlocksInput = {
  organizationId: string;
  propertyId: string;
  page: number;
  pageSize: number;
};

export type PaginatedBlocks = {
  items: BlockDto[];
  total: number;
  page: number;
  pageSize: number;
};

export interface BlockServiceContract {
  list(input: ListBlocksInput): Promise<PaginatedBlocks>;
  create(input: CreateBlockInput): Promise<BlockDto>;
}

export type UnitDto = {
  id: string;
  propertyId: string;
  blockId: string | null;
  blockName: string | null;
  code: string;
  floor: number | null;
  areaM2: string | null;
  shareRatio: string | null;
};

export type CreateUnitInput = {
  organizationId: string;
  propertyId: string;
  blockId?: string | null;
  code: string;
  floor?: number | null;
  areaM2?: string | null;
  shareRatio?: string | null;
  actorUserId?: string | null;
};

export type ListUnitsInput = {
  organizationId: string;
  propertyId: string;
  page: number;
  pageSize: number;
  blockId?: string | null;
};

export type PaginatedUnits = {
  items: UnitDto[];
  total: number;
  page: number;
  pageSize: number;
};

export interface UnitServiceContract {
  list(input: ListUnitsInput): Promise<PaginatedUnits>;
  create(input: CreateUnitInput): Promise<UnitDto>;
}
