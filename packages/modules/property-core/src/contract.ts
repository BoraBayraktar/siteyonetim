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
  propertyIds?: string[];
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
  findByIdAny(propertyId: string): Promise<PropertyDto | null>;
  listNavItemsGlobal(): Promise<Array<{ id: string; name: string }>>;
  getShowcaseProperty(): Promise<PropertyDto | null>;
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

export type DeleteBlockInput = {
  organizationId: string;
  propertyId: string;
  blockId: string;
  actorUserId?: string | null;
};

export interface BlockServiceContract {
  list(input: ListBlocksInput): Promise<PaginatedBlocks>;
  create(input: CreateBlockInput): Promise<BlockDto>;
  update(input: UpdateBlockInput): Promise<BlockDto>;
  delete(input: DeleteBlockInput): Promise<void>;
}

export type UpdateBlockInput = {
  organizationId: string;
  propertyId: string;
  blockId: string;
  name: string;
  sortOrder?: number;
  actorUserId?: string | null;
};

export type UpdateUnitInput = {
  organizationId: string;
  propertyId: string;
  unitId: string;
  blockId?: string | null;
  code: string;
  floor?: number | null;
  areaM2?: string | null;
  shareRatio?: string | null;
  actorUserId?: string | null;
};

export type BulkImportUnitsInput = {
  organizationId: string;
  propertyId: string;
  xlsxBuffer: Buffer;
  actorUserId?: string | null;
};

export type PropertyUnitScopeInput = {
  organizationId: string;
  propertyId: string;
  actorUserId?: string | null;
};

export type ExportUnitsExcelInput = {
  organizationId: string;
  propertyId: string;
  locale: string;
  templateOnly?: boolean;
  actorUserId?: string | null;
};

export type ExportUnitsExcelResult = {
  buffer: Buffer;
  fileName: string;
  contentType: string;
};

export type BulkImportUnitsResult = {
  created: number;
  updated: number;
  skipped: number;
  removedMalformed: number;
  errors: string[];
  occupancyAssignments: UnitImportOccupancyAssignment[];
};

export type UnitImportOccupancyAssignment = {
  lineNo: number;
  unitId: string;
  ownerName: string | null;
  tenantName: string | null;
};

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

export type DeleteUnitInput = {
  organizationId: string;
  propertyId: string;
  unitId: string;
  actorUserId?: string | null;
};

export interface UnitServiceContract {
  list(input: ListUnitsInput): Promise<PaginatedUnits>;
  create(input: CreateUnitInput): Promise<UnitDto>;
  update(input: UpdateUnitInput): Promise<UnitDto>;
  delete(input: DeleteUnitInput): Promise<void>;
  cleanupMalformedImportUnits(input: PropertyUnitScopeInput): Promise<number>;
  bulkImportFromXlsx(input: BulkImportUnitsInput): Promise<BulkImportUnitsResult>;
  exportToXlsx(input: ExportUnitsExcelInput): Promise<ExportUnitsExcelResult>;
}
