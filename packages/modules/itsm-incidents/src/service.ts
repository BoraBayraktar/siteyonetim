import { LedgerEntryType } from "@siteyonetim/db";
import { createFinanceService } from "@siteyonetim/finance-core";
import { createOccupancyService } from "@siteyonetim/property-occupancy";
import { createPropertyTenantService } from "@siteyonetim/platform-tenant";
import { createAuditService } from "@siteyonetim/platform-audit";
import type {
  CloseIncidentWithExpenseInput,
  CreateIncidentInput,
  CreatePortalIncidentInput,
  IncidentContext,
  IncidentDto,
  IncidentServiceContract,
  ListIncidentsInput,
  ListPortalIncidentsInput,
  PaginatedIncidents,
  UpdateIncidentStatusInput,
} from "./contract";
import { INCIDENT_CLOSED_WITH_EXPENSE_EVENT, INCIDENT_CREATED_EVENT } from "./contract";
import { INCIDENT_STATUS, isStaffIncidentTransitionAllowed, type IncidentStatusValue } from "./incident-status";
import { IncidentRepository } from "./repository";

function mapIncidentRow(row: {
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
}): IncidentDto {
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

export class IncidentService implements IncidentServiceContract {
  constructor(
    private readonly repository = new IncidentRepository(),
    private readonly audit = createAuditService(),
    private readonly tenantService = createPropertyTenantService(),
    private readonly occupancyService = createOccupancyService(),
    private readonly financeService = createFinanceService(),
  ) {}

  async create(input: CreateIncidentInput) {
    const title = input.title.trim();
    const description = input.description.trim();

    if (!title) {
      throw new Error("INCIDENT_TITLE_REQUIRED");
    }
    if (!description) {
      throw new Error("INCIDENT_DESCRIPTION_REQUIRED");
    }

    const propertyOk = await this.repository.propertyExists(input.organizationId, input.propertyId);
    if (!propertyOk) {
      throw new Error("PROPERTY_NOT_FOUND");
    }

    if (input.unitId) {
      const unitOk = await this.repository.unitInProperty(input.propertyId, input.unitId);
      if (!unitOk) {
        throw new Error("INCIDENT_UNIT_INVALID");
      }
    }

    const actorUserId = input.actorUserId;
    if (!actorUserId) {
      throw new Error("UNAUTHORIZED");
    }

    const reporterDisplayName = (await this.repository.findReporterDisplayName(actorUserId)) ?? "Staff";
    const created = await this.repository.create(input, actorUserId, reporterDisplayName);

    await this.audit.record({
      organizationId: input.organizationId,
      userId: actorUserId,
      action: "incident.create",
      entityType: "Incident",
      entityId: created.id,
      metadata: {
        propertyId: input.propertyId,
        category: input.category,
        priority: input.priority,
        event: INCIDENT_CREATED_EVENT,
      },
    });

    return created;
  }

  async createForPortal(input: CreatePortalIncidentInput) {
    const title = input.title.trim();
    const description = input.description.trim();

    if (!title) {
      throw new Error("INCIDENT_TITLE_REQUIRED");
    }
    if (!description) {
      throw new Error("INCIDENT_DESCRIPTION_REQUIRED");
    }
    if (!input.reporterDisplayName.trim()) {
      throw new Error("UNAUTHORIZED");
    }
    if (!input.reporterUserId && !input.reporterCredentialId) {
      throw new Error("UNAUTHORIZED");
    }

    const propertyOk = await this.repository.propertyExists(input.organizationId, input.propertyId);
    if (!propertyOk) {
      throw new Error("PROPERTY_NOT_FOUND");
    }

    const portalSettings = await this.tenantService.getPortalSettings(input.organizationId, input.propertyId);
    if (portalSettings?.showIncidents === false) {
      throw new Error("INCIDENT_PORTAL_DISABLED");
    }

    let unitId = input.unitId ?? null;

    if (input.reporterCredentialId) {
      if (unitId) {
        const unitOk = await this.repository.unitInProperty(input.propertyId, unitId);
        if (!unitOk) {
          throw new Error("INCIDENT_UNIT_INVALID");
        }
      }
    } else if (input.reporterUserId) {
      const units = await this.occupancyService.listForPortalUser(input.reporterUserId);
      const allowedUnitIds = units
        .filter((unit) => unit.propertyId === input.propertyId)
        .map((unit) => unit.unitId);

      if (unitId) {
        if (!allowedUnitIds.includes(unitId)) {
          throw new Error("INCIDENT_UNIT_INVALID");
        }
      } else if (allowedUnitIds.length === 1) {
        unitId = allowedUnitIds[0]!;
      }
    }

    const created = await this.repository.createForPortal({
      ...input,
      unitId,
      title,
      description,
      reporterDisplayName: input.reporterDisplayName.trim(),
    });

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.reporterUserId,
      action: "incident.create.portal",
      entityType: "Incident",
      entityId: created.id,
      metadata: {
        propertyId: input.propertyId,
        category: input.category,
        reporterCredentialId: input.reporterCredentialId ?? null,
        event: INCIDENT_CREATED_EVENT,
      },
    });

    return created;
  }

  async updateStatus(input: UpdateIncidentStatusInput) {
    const existing = await this.repository.findById(input, input.incidentId);
    if (!existing) {
      throw new Error("INCIDENT_NOT_FOUND");
    }

    if (existing.status === input.status) {
      return existing;
    }

    if (!input.managerOverride) {
      if (!isStaffIncidentTransitionAllowed(existing.status as IncidentStatusValue, input.status as IncidentStatusValue)) {
        throw new Error("INCIDENT_STATUS_TRANSITION_DENIED");
      }
    }

    const updated = await this.repository.updateStatus(
      input,
      input.incidentId,
      input.status,
      input.status === INCIDENT_STATUS.CLOSED ? new Date() : null,
    );
    if (!updated) {
      throw new Error("INCIDENT_NOT_FOUND");
    }

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "incident.status.update",
      entityType: "Incident",
      entityId: updated.id,
      metadata: {
        propertyId: input.propertyId,
        from: existing.status,
        to: input.status,
      },
    });

    return updated;
  }

  async closeWithExpense(input: CloseIncidentWithExpenseInput) {
    const existing = await this.repository.findById(input, input.incidentId);
    if (!existing) {
      throw new Error("INCIDENT_NOT_FOUND");
    }
    if (existing.status === INCIDENT_STATUS.CLOSED) {
      throw new Error("INCIDENT_ALREADY_CLOSED");
    }
    if (existing.ledgerEntryId) {
      throw new Error("INCIDENT_EXPENSE_ALREADY_LINKED");
    }

    const actorUserId = input.actorUserId;
    if (!actorUserId) {
      throw new Error("UNAUTHORIZED");
    }

    const expenseDescription =
      input.description?.trim() ||
      `Arıza: ${existing.title}`;

    const ledger = await this.financeService.createLedgerEntry({
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      actorUserId,
      entryType: LedgerEntryType.EXPENSE,
      categoryId: input.categoryId,
      amount: input.amount,
      cashboxId: input.cashboxId ?? null,
      financeAccountId: input.financeAccountId ?? null,
      documentNo: input.documentNo ?? null,
      description: expenseDescription,
    });

    const updated = await this.repository.updateStatus(
      input,
      input.incidentId,
      INCIDENT_STATUS.CLOSED,
      new Date(),
      ledger.id,
    );
    if (!updated) {
      throw new Error("INCIDENT_NOT_FOUND");
    }

    await this.audit.record({
      organizationId: input.organizationId,
      userId: actorUserId,
      action: "incident.close.with_expense",
      entityType: "Incident",
      entityId: updated.id,
      metadata: {
        propertyId: input.propertyId,
        ledgerEntryId: ledger.id,
        amount: ledger.amount,
        event: INCIDENT_CLOSED_WITH_EXPENSE_EVENT,
      },
    });

    return updated;
  }

  async list(input: ListIncidentsInput): Promise<PaginatedIncidents> {
    const { rows, total, page, pageSize } = await this.repository.list(input);
    return {
      items: rows.map(mapIncidentRow),
      total,
      page,
      pageSize,
    };
  }

  async listForPortal(input: ListPortalIncidentsInput): Promise<PaginatedIncidents> {
    const { rows, total, page, pageSize } = await this.repository.listForPortal(input);
    return {
      items: rows.map(mapIncidentRow),
      total,
      page,
      pageSize,
    };
  }

  async getSummary(input: IncidentContext) {
    return this.repository.countByStatus(input);
  }
}

export function createIncidentService(): IncidentService {
  return new IncidentService();
}
