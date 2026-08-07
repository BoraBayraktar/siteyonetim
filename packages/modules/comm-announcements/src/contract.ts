import type { AnnouncementAudience, AnnouncementWorkflowStatus } from "@siteyonetim/db";

import type { AnnouncementBodyFormatValue } from "./body-format";

export type AnnouncementDto = {
  id: string;
  propertyId: string;
  title: string;
  body: string;
  bodyFormat: AnnouncementBodyFormatValue;
  audience: AnnouncementAudience;
  blockId: string | null;
  blockName: string | null;
  isPinned: boolean;
  publishedAt: Date;
  publishStartAt: Date;
  publishEndAt: Date;
  unitIds: string[];
  workflowStatus: AnnouncementWorkflowStatus;
  createdByUserId: string | null;
  readByUser: boolean;
};

export type CreateAnnouncementInput = {
  organizationId: string;
  propertyId: string;
  title: string;
  body: string;
  bodyFormat?: AnnouncementBodyFormatValue;
  audience: AnnouncementAudience;
  blockId?: string | null;
  unitIds?: string[];
  isPinned?: boolean;
  publishStartAt: Date;
  publishEndAt: Date;
  workflowStatus?: AnnouncementWorkflowStatus;
  createdByUserId?: string | null;
  actorUserId?: string | null;
};

export type ListAnnouncementsAdminInput = {
  organizationId: string;
  propertyId: string;
  page: number;
  pageSize: number;
  /** When set, include published items and drafts created by this user. */
  staffViewerId?: string;
};

export type PublishAnnouncementInput = {
  organizationId: string;
  propertyId: string;
  announcementId: string;
  actorUserId?: string | null;
};

export type PaginatedAnnouncements = {
  items: AnnouncementDto[];
  total: number;
  page: number;
  pageSize: number;
};

export type PortalAnnouncementScope = {
  propertyId: string;
  unitId: string;
  blockId: string | null;
};

export type ListAnnouncementsPortalInput = {
  organizationId: string;
  userId: string;
  scopes: PortalAnnouncementScope[];
  page: number;
  pageSize: number;
};

export type GetAnnouncementInput = {
  organizationId: string;
  propertyId: string;
  announcementId: string;
};

export interface AnnouncementServiceContract {
  create(input: CreateAnnouncementInput): Promise<AnnouncementDto>;
  publish(input: PublishAnnouncementInput): Promise<AnnouncementDto>;
  getById(input: GetAnnouncementInput): Promise<AnnouncementDto | null>;
  listForAdmin(input: ListAnnouncementsAdminInput): Promise<PaginatedAnnouncements>;
  listForPortal(input: ListAnnouncementsPortalInput): Promise<PaginatedAnnouncements>;
  markRead(organizationId: string, announcementId: string, userId: string): Promise<void>;
}
