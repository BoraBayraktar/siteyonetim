import { DocumentCategory, DocumentVisibility, prisma } from "@siteyonetim/db";
import { randomUUID } from "node:crypto";
import path from "node:path";

import type {
  CreateDocumentInput,
  DocumentDto,
  ListDocumentsAdminInput,
  ListDocumentsPortalInput,
  OpenDocumentDownloadInput,
  PortalDocumentScope,
} from "./contract";

type DocumentRow = {
  id: string;
  propertyId: string;
  title: string;
  category: DocumentDto["category"];
  visibility: DocumentVisibility;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  createdAt: Date;
  unitTargets: { unitId: string }[];
};

const include = {
  unitTargets: { select: { unitId: true } },
};

function toDto(row: DocumentRow): DocumentDto {
  return {
    id: row.id,
    propertyId: row.propertyId,
    title: row.title,
    category: row.category,
    visibility: row.visibility,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    unitIds: row.unitTargets.map((t) => t.unitId),
    createdAt: row.createdAt,
  };
}

function sanitizeFileName(fileName: string): string {
  const base = path.basename(fileName).replace(/[^\w.\-()+ ]/g, "_");
  return base.slice(0, 200) || "file";
}

export function buildStorageKey(organizationId: string, propertyId: string, fileName: string): string {
  return `${organizationId}/${propertyId}/${randomUUID()}-${sanitizeFileName(fileName)}`;
}

export class DocumentRepository {
  async create(input: CreateDocumentInput, storageKey: string, sizeBytes: number): Promise<DocumentDto> {
    const created = await prisma.document.create({
      data: {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        title: input.title,
        category: input.category,
        visibility: input.visibility,
        fileName: sanitizeFileName(input.fileName),
        mimeType: input.mimeType,
        sizeBytes,
        storageKey,
        uploadedByUserId: input.actorUserId ?? null,
        unitTargets:
          input.visibility === DocumentVisibility.UNIT_SPECIFIC && input.unitIds?.length
            ? { create: input.unitIds.map((unitId) => ({ unitId })) }
            : undefined,
      },
      include,
    });
    return toDto(created as DocumentRow);
  }

  async listForAdmin(input: ListDocumentsAdminInput) {
    const where = {
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      deleted: false,
    };
    const [rows, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include,
        orderBy: { createdAt: "desc" },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      prisma.document.count({ where }),
    ]);
    return { rows: (rows as DocumentRow[]).map(toDto), total };
  }

  async listForPortal(input: ListDocumentsPortalInput) {
    if (input.scopes.length === 0) {
      return { rows: [] as DocumentDto[], total: 0 };
    }

    const propertyIds = [...new Set(input.scopes.map((scope) => scope.propertyId))];
    const scopeFilters = input.scopes.flatMap((scope) => [
      {
        propertyId: scope.propertyId,
        visibility: DocumentVisibility.PORTAL_SHARED,
      },
      {
        propertyId: scope.propertyId,
        visibility: DocumentVisibility.UNIT_SPECIFIC,
        unitTargets: { some: { unitId: scope.unitId } },
      },
    ]);

    const where = {
      organizationId: input.organizationId,
      propertyId: { in: propertyIds },
      deleted: false,
      visibility: { in: [DocumentVisibility.PORTAL_SHARED, DocumentVisibility.UNIT_SPECIFIC] },
      OR: scopeFilters,
    };

    const page = Math.max(1, input.page);
    const pageSize = Math.min(Math.max(input.pageSize, 1), 100);
    const [rows, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.document.count({ where }),
    ]);

    return { rows: (rows as DocumentRow[]).map(toDto), total };
  }

  async listPortalCandidates(organizationId: string, propertyIds: string[]) {
    if (propertyIds.length === 0) {
      return [];
    }
    const rows = await prisma.document.findMany({
      where: {
        organizationId,
        propertyId: { in: propertyIds },
        deleted: false,
        visibility: { in: [DocumentVisibility.PORTAL_SHARED, DocumentVisibility.UNIT_SPECIFIC] },
      },
      include,
      orderBy: { createdAt: "desc" },
    });
    return (rows as DocumentRow[]).map(toDto);
  }

  async findForDownload(input: OpenDocumentDownloadInput) {
    return prisma.document.findFirst({
      where: {
        id: input.documentId,
        organizationId: input.organizationId,
        deleted: false,
      },
      include,
    });
  }

  async propertyExists(organizationId: string, propertyId: string) {
    const row = await prisma.property.findFirst({
      where: { id: propertyId, organizationId, deleted: false },
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

  async listBoardMinutesSummary(input: {
    organizationId: string;
    propertyId: string;
    year: number;
    limit?: number;
  }) {
    const start = new Date(input.year, 0, 1);
    const end = new Date(input.year + 1, 0, 1);
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 20);
    const where = {
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      category: DocumentCategory.BOARD_MINUTES,
      deleted: false,
      createdAt: { gte: start, lt: end },
    };

    const [items, count] = await Promise.all([
      prisma.document.findMany({
        where,
        select: { title: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.document.count({ where }),
    ]);

    return { count, items };
  }
}

export function matchesPortalDocumentScope(document: DocumentDto, scopes: PortalDocumentScope[]): boolean {
  for (const scope of scopes) {
    if (scope.propertyId !== document.propertyId) {
      continue;
    }
    if (document.visibility === DocumentVisibility.PORTAL_SHARED) {
      return true;
    }
    if (document.visibility === DocumentVisibility.UNIT_SPECIFIC && document.unitIds.includes(scope.unitId)) {
      return true;
    }
  }
  return false;
}

export function canAccessDocument(
  document: DocumentDto,
  sessionKind: "ADMIN" | "PORTAL",
  portalScopes: PortalDocumentScope[],
): boolean {
  if (sessionKind === "ADMIN") {
    return true;
  }
  if (document.visibility === DocumentVisibility.ADMIN_ONLY) {
    return false;
  }
  return matchesPortalDocumentScope(document, portalScopes);
}
