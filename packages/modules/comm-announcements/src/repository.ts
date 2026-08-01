import { AnnouncementAudience, AnnouncementBodyFormat, prisma } from "@siteyonetim/db";

import type {
  AnnouncementDto,
  CreateAnnouncementInput,
  ListAnnouncementsAdminInput,
  ListAnnouncementsPortalInput,
  PortalAnnouncementScope,
} from "./contract";
import { ANNOUNCEMENT_BODY_FORMAT, type AnnouncementBodyFormatValue } from "./body-format";
import { portalVisibilityFilter } from "./publish-window";

function toPrismaBodyFormat(value: AnnouncementBodyFormatValue): AnnouncementBodyFormat {
  return value === ANNOUNCEMENT_BODY_FORMAT.HTML ? AnnouncementBodyFormat.HTML : AnnouncementBodyFormat.PLAIN;
}

type AnnouncementRow = {
  id: string;
  propertyId: string;
  title: string;
  body: string;
  bodyFormat: AnnouncementDto["bodyFormat"];
  audience: AnnouncementAudience;
  blockId: string | null;
  isPinned: boolean;
  publishedAt: Date;
  publishStartAt: Date;
  publishEndAt: Date;
  block: { name: string } | null;
  unitTargets: { unitId: string }[];
  reads: { userId: string }[];
};

function toDto(row: AnnouncementRow, userId?: string): AnnouncementDto {
  return {
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
    readByUser: userId ? row.reads.some((r) => r.userId === userId) : false,
  };
}

const include = (userId?: string) => ({
  block: { select: { name: true } },
  unitTargets: { select: { unitId: true } },
  reads: userId ? { where: { userId }, select: { userId: true } } : { select: { userId: true }, take: 0 },
});

export class AnnouncementRepository {
  async create(input: CreateAnnouncementInput): Promise<AnnouncementDto> {
    const created = await prisma.announcement.create({
      data: {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        title: input.title,
        body: input.body,
        bodyFormat: toPrismaBodyFormat(input.bodyFormat ?? ANNOUNCEMENT_BODY_FORMAT.PLAIN),
        audience: input.audience,
        blockId: input.audience === AnnouncementAudience.BLOCK ? input.blockId : null,
        isPinned: input.isPinned ?? false,
        publishStartAt: input.publishStartAt,
        publishEndAt: input.publishEndAt,
        unitTargets:
          input.audience === AnnouncementAudience.UNITS && input.unitIds?.length
            ? { create: input.unitIds.map((unitId) => ({ unitId })) }
            : undefined,
      },
      include: include(),
    });
    return toDto(created as AnnouncementRow);
  }

  async listForAdmin(input: ListAnnouncementsAdminInput) {
    const where = {
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      deleted: false,
    };
    const [rows, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        include: include(),
        orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      prisma.announcement.count({ where }),
    ]);
    return { rows: rows as AnnouncementRow[], total };
  }

  async getById(organizationId: string, propertyId: string, announcementId: string): Promise<AnnouncementDto | null> {
    const row = await prisma.announcement.findFirst({
      where: {
        id: announcementId,
        organizationId,
        propertyId,
        deleted: false,
      },
      include: include(),
    });
    if (!row) {
      return null;
    }
    return toDto(row as AnnouncementRow);
  }

  async listForPortal(input: ListAnnouncementsPortalInput) {
    if (input.scopes.length === 0) {
      return { rows: [] as AnnouncementRow[], total: 0 };
    }

    const propertyIds = [...new Set(input.scopes.map((scope) => scope.propertyId))];
    const scopeFilters = input.scopes.flatMap((scope) => [
      {
        propertyId: scope.propertyId,
        audience: AnnouncementAudience.PROPERTY_ALL,
      },
      {
        propertyId: scope.propertyId,
        audience: AnnouncementAudience.BLOCK,
        blockId: scope.blockId ?? undefined,
      },
      {
        propertyId: scope.propertyId,
        audience: AnnouncementAudience.UNITS,
        unitTargets: { some: { unitId: scope.unitId } },
      },
    ]);

    const now = new Date();
    const where = {
      organizationId: input.organizationId,
      propertyId: { in: propertyIds },
      deleted: false,
      ...portalVisibilityFilter(now),
      OR: scopeFilters,
    };

    const page = Math.max(1, input.page);
    const pageSize = Math.min(Math.max(input.pageSize, 1), 100);
    const [rows, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        include: include(input.userId),
        orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.announcement.count({ where }),
    ]);

    return { rows: rows as AnnouncementRow[], total };
  }

  async listCandidatesForPortal(organizationId: string, propertyIds: string[], userId: string) {
    if (propertyIds.length === 0) {
      return [];
    }
    const now = new Date();
    const rows = await prisma.announcement.findMany({
      where: {
        organizationId,
        propertyId: { in: propertyIds },
        deleted: false,
        ...portalVisibilityFilter(now),
      },
      include: include(userId),
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
    });
    return rows as AnnouncementRow[];
  }

  async markRead(announcementId: string, userId: string) {
    await prisma.announcementRead.upsert({
      where: { announcementId_userId: { announcementId, userId } },
      create: { announcementId, userId },
      update: { readAt: new Date() },
    });
  }

  async propertyExists(organizationId: string, propertyId: string) {
    const row = await prisma.property.findFirst({
      where: { id: propertyId, organizationId, deleted: false },
      select: { id: true },
    });
    return Boolean(row);
  }

  async blockInProperty(propertyId: string, blockId: string) {
    const row = await prisma.block.findFirst({
      where: { id: blockId, propertyId, deleted: false },
      select: { id: true },
    });
    return Boolean(row);
  }

  async unitsInProperty(propertyId: string, unitIds: string[]) {
    if (unitIds.length === 0) return false;
    const count = await prisma.unit.count({
      where: { propertyId, deleted: false, id: { in: unitIds } },
    });
    return count === unitIds.length;
  }
}

export function matchesPortalScope(announcement: AnnouncementDto, scopes: PortalAnnouncementScope[]): boolean {
  for (const scope of scopes) {
    if (scope.propertyId !== announcement.propertyId) {
      continue;
    }
    if (announcement.audience === AnnouncementAudience.PROPERTY_ALL) {
      return true;
    }
    if (
      announcement.audience === AnnouncementAudience.BLOCK &&
      announcement.blockId &&
      scope.blockId === announcement.blockId
    ) {
      return true;
    }
    if (announcement.audience === AnnouncementAudience.UNITS && announcement.unitIds.includes(scope.unitId)) {
      return true;
    }
  }
  return false;
}
