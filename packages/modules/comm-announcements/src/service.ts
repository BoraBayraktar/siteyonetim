import { AnnouncementAudience } from "@siteyonetim/db";
import { createAuditService } from "@siteyonetim/platform-audit";

import type {
  AnnouncementDto,
  AnnouncementServiceContract,
  CreateAnnouncementInput,
  GetAnnouncementInput,
  ListAnnouncementsAdminInput,
  ListAnnouncementsPortalInput,
  PaginatedAnnouncements,
} from "./contract";
import {
  ANNOUNCEMENT_BODY_FORMAT,
  resolveAnnouncementBodyFormat,
} from "./body-format";
import { isEmptyAnnouncementBody, sanitizeAnnouncementHtml } from "./html";
import { AnnouncementRepository } from "./repository";

export class AnnouncementService implements AnnouncementServiceContract {
  constructor(
    private readonly repository = new AnnouncementRepository(),
    private readonly audit = createAuditService(),
  ) {}

  async create(input: CreateAnnouncementInput): Promise<AnnouncementDto> {
    const title = input.title.trim();
    const bodyFormat = resolveAnnouncementBodyFormat(input.bodyFormat);
    const rawBody = input.body.trim();
    const body =
      bodyFormat === ANNOUNCEMENT_BODY_FORMAT.HTML ? sanitizeAnnouncementHtml(rawBody) : rawBody;

    if (!title) {
      throw new Error("ANNOUNCEMENT_TITLE_REQUIRED");
    }
    if (isEmptyAnnouncementBody(body, bodyFormat)) {
      throw new Error("ANNOUNCEMENT_BODY_REQUIRED");
    }
    if (!input.publishStartAt || !input.publishEndAt) {
      throw new Error("ANNOUNCEMENT_PUBLISH_DATES_REQUIRED");
    }
    if (input.publishEndAt < input.publishStartAt) {
      throw new Error("ANNOUNCEMENT_PUBLISH_END_BEFORE_START");
    }

    const propertyOk = await this.repository.propertyExists(input.organizationId, input.propertyId);
    if (!propertyOk) {
      throw new Error("PROPERTY_NOT_FOUND");
    }

    if (input.audience === AnnouncementAudience.BLOCK) {
      if (!input.blockId) {
        throw new Error("ANNOUNCEMENT_BLOCK_REQUIRED");
      }
      const blockOk = await this.repository.blockInProperty(input.propertyId, input.blockId);
      if (!blockOk) {
        throw new Error("ANNOUNCEMENT_BLOCK_INVALID");
      }
    }

    if (input.audience === AnnouncementAudience.UNITS) {
      const unitIds = input.unitIds ?? [];
      if (unitIds.length === 0) {
        throw new Error("ANNOUNCEMENT_UNITS_REQUIRED");
      }
      const unitsOk = await this.repository.unitsInProperty(input.propertyId, unitIds);
      if (!unitsOk) {
        throw new Error("ANNOUNCEMENT_UNITS_INVALID");
      }
    }

    const created = await this.repository.create({
      ...input,
      title,
      body,
      bodyFormat,
    });

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "announcement.create",
      entityType: "Announcement",
      entityId: created.id,
      metadata: { propertyId: input.propertyId, audience: input.audience, title },
    });

    return created;
  }

  async getById(input: GetAnnouncementInput): Promise<AnnouncementDto | null> {
    return this.repository.getById(input.organizationId, input.propertyId, input.announcementId);
  }

  async listForAdmin(input: ListAnnouncementsAdminInput): Promise<PaginatedAnnouncements> {
    const { rows, total } = await this.repository.listForAdmin(input);
    return {
      items: rows.map((row) => ({
        id: row.id,
        propertyId: row.propertyId,
        title: row.title,
        body: row.body,
        bodyFormat: row.bodyFormat,
        audience: row.audience,
        blockId: row.blockId,
        blockName: row.block?.name ?? null,
        isPinned: row.isPinned,
        publishedAt: row.publishedAt,
        publishStartAt: row.publishStartAt,
        publishEndAt: row.publishEndAt,
        unitIds: row.unitTargets.map((t) => t.unitId),
        readByUser: false,
      })),
      total,
      page: input.page,
      pageSize: input.pageSize,
    };
  }

  async listForPortal(input: ListAnnouncementsPortalInput): Promise<PaginatedAnnouncements> {
    const { rows, total } = await this.repository.listForPortal(input);
    return {
      items: rows.map((row) => ({
        id: row.id,
        propertyId: row.propertyId,
        title: row.title,
        body: row.body,
        bodyFormat: row.bodyFormat,
        audience: row.audience,
        blockId: row.blockId,
        blockName: row.block?.name ?? null,
        isPinned: row.isPinned,
        publishedAt: row.publishedAt,
        publishStartAt: row.publishStartAt,
        publishEndAt: row.publishEndAt,
        unitIds: row.unitTargets.map((t) => t.unitId),
        readByUser: row.reads.some((r) => r.userId === input.userId),
      })),
      total,
      page: input.page,
      pageSize: input.pageSize,
    };
  }

  async markRead(organizationId: string, announcementId: string, userId: string): Promise<void> {
    await this.repository.markRead(announcementId, userId);
    await this.audit.record({
      organizationId,
      userId,
      action: "announcement.read",
      entityType: "Announcement",
      entityId: announcementId,
    });
  }
}

export function createAnnouncementService(): AnnouncementService {
  return new AnnouncementService();
}
