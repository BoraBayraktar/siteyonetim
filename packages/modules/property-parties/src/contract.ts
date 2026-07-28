import type { PartyType } from "@siteyonetim/db";

export type PartyDto = {
  id: string;
  organizationId: string;
  type: PartyType;
  displayName: string;
  email: string | null;
  phone: string | null;
  hasPortalAccess: boolean;
  activeOccupancyCount: number;
};

export type CreatePartyInput = {
  organizationId: string;
  type: PartyType;
  displayName: string;
  email?: string | null;
  phone?: string | null;
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

export interface PartyServiceContract {
  list(input: ListPartiesInput): Promise<PaginatedParties>;
  create(input: CreatePartyInput): Promise<PartyDto>;
  invitePortalAccess(input: InvitePortalAccessInput): Promise<PartyDto>;
}
