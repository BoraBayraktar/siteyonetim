import type { PartyType } from "@siteyonetim/db";

export type PartyDto = {
  id: string;
  organizationId: string;
  type: PartyType;
  displayName: string;
  email: string | null;
  phone: string | null;
  communicationConsent: boolean;
  hasPortalAccess: boolean;
  activeOccupancyCount: number;
};

export type CreatePartyInput = {
  organizationId: string;
  type: PartyType;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  communicationConsent?: boolean;
  actorUserId?: string | null;
};

export type ListPartiesInput = {
  organizationId: string;
  propertyId?: string | null;
  page: number;
  pageSize: number;
};

export type PaginatedParties = {
  items: PartyDto[];
  total: number;
  page: number;
  pageSize: number;
};

export type InvitePortalAccessInput = {
  organizationId: string;
  partyId: string;
  email: string;
  password: string;
  name: string;
  actorUserId?: string | null;
};

export type UpdatePartyInput = {
  organizationId: string;
  partyId: string;
  type: PartyType;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  communicationConsent?: boolean;
  actorUserId?: string | null;
};

export type DeletePartyInput = {
  organizationId: string;
  partyId: string;
  actorUserId?: string | null;
};

export type BulkImportPartiesInput = {
  organizationId: string;
  xlsxBuffer: Buffer;
  actorUserId?: string | null;
};

export type ExportPartiesExcelInput = {
  organizationId: string;
  locale: string;
  sheetTitle: string;
  templateOnly?: boolean;
  actorUserId?: string | null;
};

export type ExportPartiesExcelResult = {
  buffer: Buffer;
  fileName: string;
  contentType: string;
};

export type BulkImportPartiesResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
};

export interface PartyServiceContract {
  list(input: ListPartiesInput): Promise<PaginatedParties>;
  create(input: CreatePartyInput): Promise<PartyDto>;
  findOrCreateByDisplayName(input: CreatePartyInput): Promise<PartyDto>;
  update(input: UpdatePartyInput): Promise<PartyDto>;
  delete(input: DeletePartyInput): Promise<void>;
  invitePortalAccess(input: InvitePortalAccessInput): Promise<PartyDto>;
  bulkImportFromXlsx(input: BulkImportPartiesInput): Promise<BulkImportPartiesResult>;
  exportToXlsx(input: ExportPartiesExcelInput): Promise<ExportPartiesExcelResult>;
}
