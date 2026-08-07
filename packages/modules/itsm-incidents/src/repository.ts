import { prisma } from "@siteyonetim/db";
import type { IncidentStatus } from "@siteyonetim/db";

import type {
  CreateIncidentInput,
  CreatePortalIncidentInput,
  IncidentContext,
  IncidentDto,
  ListIncidentsInput,
  ListPortalIncidentsInput,
} from "./contract";
import { INCIDENT_STATUS } from "./incident-status";

type IncidentRow = {
  id: string;
  propertyId: string;
  title: string;
  description: string;
  status: IncidentDto["status"];
  priority: IncidentDto["priority"];
  category: IncidentDto["category"];
  unitId: string | null;
  reportedByUserId: string | null;
  reporterDisplayName: string;
  ledgerEntryId: string | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  unit: { code: string } | null;
  reportedBy: { name: string } | null;
  ledgerEntry: {
    id: string;
    amount: { toString(): string };
    description: string | null;
    category: { name: string };
  } | null;
};

const include = {
  unit: { select: { code: true } },
  reportedBy: { select: { name: true } },
  ledgerEntry: {
    select: {
      id: true,
      amount: true,
      description: true,
      category: { select: { name: true } },
    },
  },
} as const;

function toDto(row: IncidentRow): IncidentDto {
  return {
    id: row.id,
    propertyId: row.propertyId,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    category: row.category,
    unitId: row.unitId,
    unitCode: row.unit?.code ?? null,
    reportedByUserId: row.reportedByUserId,
    reportedByName: row.reporterDisplayName || row.reportedBy?.name || "",
    ledgerEntryId: row.ledgerEntryId,
    linkedExpense: row.ledgerEntry
      ? {
          id: row.ledgerEntry.id,
          amount: row.ledgerEntry.amount.toString(),
          categoryName: row.ledgerEntry.category.name,
          description: row.ledgerEntry.description,
        }
      : null,
    closedAt: row.closedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class IncidentRepository {
  async create(
    input: CreateIncidentInput,
    reportedByUserId: string,
    reporterDisplayName: string,
  ): Promise<IncidentDto> {
    const created = await prisma.incident.create({
      data: {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        title: input.title,
        description: input.description,
        priority: input.priority,
        category: input.category,
        unitId: input.unitId ?? null,
        reportedByUserId,
        reporterDisplayName,
        status: INCIDENT_STATUS.OPEN,
      },
      include,
    });
    return toDto(created as IncidentRow);
  }

  async createForPortal(input: CreatePortalIncidentInput): Promise<IncidentDto> {
    const created = await prisma.incident.create({
      data: {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        title: input.title,
        description: input.description,
        category: input.category,
        unitId: input.unitId ?? null,
        reportedByUserId: input.reporterUserId ?? null,
        reportedByCredentialId: input.reporterCredentialId ?? null,
        reporterDisplayName: input.reporterDisplayName,
        status: INCIDENT_STATUS.OPEN,
      },
      include,
    });
    return toDto(created as IncidentRow);
  }

  async findById(ctx: IncidentContext, incidentId: string): Promise<IncidentDto | null> {
    const row = await prisma.incident.findFirst({
      where: {
        id: incidentId,
        organizationId: ctx.organizationId,
        propertyId: ctx.propertyId,
        deleted: false,
      },
      include,
    });
    return row ? toDto(row as IncidentRow) : null;
  }

  async updateStatus(
    ctx: IncidentContext,
    incidentId: string,
    status: IncidentStatus,
    closedAt: Date | null,
    ledgerEntryId?: string | null,
  ): Promise<IncidentDto | null> {
    const existing = await prisma.incident.findFirst({
      where: {
        id: incidentId,
        organizationId: ctx.organizationId,
        propertyId: ctx.propertyId,
        deleted: false,
      },
      select: { id: true },
    });
    if (!existing) {
      return null;
    }

    const updated = await prisma.incident.update({
      where: { id: existing.id },
      data: {
        status,
        closedAt,
        ...(ledgerEntryId !== undefined ? { ledgerEntryId } : {}),
      },
      include,
    });
    return toDto(updated as IncidentRow);
  }

  async list(input: ListIncidentsInput) {
    const where = {
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      deleted: false,
      ...(input.status && input.status !== "ALL" ? { status: input.status } : {}),
    };

    const page = Math.max(1, input.page);
    const pageSize = Math.min(Math.max(input.pageSize, 1), 100);

    const [rows, total] = await Promise.all([
      prisma.incident.findMany({
        where,
        include,
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.incident.count({ where }),
    ]);

    return { rows: rows as IncidentRow[], total, page, pageSize };
  }

  async listForPortal(input: ListPortalIncidentsInput) {
    const reporterFilter =
      input.reporterCredentialId != null
        ? { reportedByCredentialId: input.reporterCredentialId }
        : input.reporterUserId != null
          ? { reportedByUserId: input.reporterUserId }
          : null;

    if (!reporterFilter) {
      return { rows: [] as IncidentRow[], total: 0, page: 1, pageSize: input.pageSize };
    }

    const where = {
      organizationId: input.organizationId,
      deleted: false,
      ...reporterFilter,
      ...(input.propertyIds?.length ? { propertyId: { in: input.propertyIds } } : {}),
    };

    const page = Math.max(1, input.page);
    const pageSize = Math.min(Math.max(input.pageSize, 1), 100);

    const [rows, total] = await Promise.all([
      prisma.incident.findMany({
        where,
        include,
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.incident.count({ where }),
    ]);

    return { rows: rows as IncidentRow[], total, page, pageSize };
  }

  async countByStatus(ctx: IncidentContext) {
    const base = {
      organizationId: ctx.organizationId,
      propertyId: ctx.propertyId,
      deleted: false,
    };
    const [openCount, inProgressCount] = await Promise.all([
      prisma.incident.count({ where: { ...base, status: INCIDENT_STATUS.OPEN } }),
      prisma.incident.count({ where: { ...base, status: INCIDENT_STATUS.IN_PROGRESS } }),
    ]);
    return { openCount, inProgressCount };
  }

  async propertyExists(organizationId: string, propertyId: string) {
    const row = await prisma.property.findFirst({
      where: { id: propertyId, organizationId, deleted: false },
      select: { id: true },
    });
    return Boolean(row);
  }

  async unitInProperty(propertyId: string, unitId: string) {
    const row = await prisma.unit.findFirst({
      where: { id: unitId, propertyId, deleted: false },
      select: { id: true },
    });
    return Boolean(row);
  }

  async findReporterDisplayName(userId: string): Promise<string | null> {
    const row = await prisma.user.findFirst({
      where: { id: userId, deleted: false },
      select: { name: true },
    });
    return row?.name ?? null;
  }
}
