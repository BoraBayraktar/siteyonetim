import type { IncidentCategory, IncidentPriority, IncidentStatus } from "@siteyonetim/db";

/** Domain event name for future subscribers (e.g. finance, notifications). */
export const INCIDENT_CREATED_EVENT = "incident.created" as const;
export const INCIDENT_CLOSED_WITH_EXPENSE_EVENT = "incident.closed.with_expense" as const;

export type IncidentContext = {
  organizationId: string;
  propertyId: string;
  actorUserId?: string | null;
};

export type IncidentLinkedExpenseDto = {
  id: string;
  amount: string;
  categoryName: string;
  description: string | null;
};

export type IncidentDto = {
  id: string;
  propertyId: string;
  title: string;
  description: string;
  status: IncidentStatus;
  priority: IncidentPriority;
  category: IncidentCategory;
  unitId: string | null;
  unitCode: string | null;
  reportedByUserId: string | null;
  reportedByName: string;
  ledgerEntryId: string | null;
  linkedExpense: IncidentLinkedExpenseDto | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateIncidentInput = IncidentContext & {
  title: string;
  description: string;
  priority?: IncidentPriority;
  category: IncidentCategory;
  unitId?: string | null;
};

export type CreatePortalIncidentInput = {
  organizationId: string;
  propertyId: string;
  title: string;
  description: string;
  category: IncidentCategory;
  unitId?: string | null;
  reporterUserId?: string | null;
  reporterCredentialId?: string | null;
  reporterDisplayName: string;
};

export type ListPortalIncidentsInput = {
  organizationId: string;
  page: number;
  pageSize: number;
  reporterUserId?: string | null;
  reporterCredentialId?: string | null;
  propertyIds?: string[];
};

export type UpdateIncidentStatusInput = IncidentContext & {
  incidentId: string;
  status: IncidentStatus;
  /** When true, skip staff transition rules (managers). */
  managerOverride?: boolean;
};

export type CloseIncidentWithExpenseInput = IncidentContext & {
  incidentId: string;
  amount: string;
  categoryId: string;
  cashboxId?: string | null;
  financeAccountId?: string | null;
  description?: string | null;
  documentNo?: string | null;
};

export type ListIncidentsInput = IncidentContext & {
  page: number;
  pageSize: number;
  status?: IncidentStatus | "ALL";
};

export type PaginatedIncidents = {
  items: IncidentDto[];
  total: number;
  page: number;
  pageSize: number;
};

export type IncidentSummaryDto = {
  openCount: number;
  inProgressCount: number;
};

export interface IncidentServiceContract {
  create(input: CreateIncidentInput): Promise<IncidentDto>;
  createForPortal(input: CreatePortalIncidentInput): Promise<IncidentDto>;
  updateStatus(input: UpdateIncidentStatusInput): Promise<IncidentDto>;
  closeWithExpense(input: CloseIncidentWithExpenseInput): Promise<IncidentDto>;
  list(input: ListIncidentsInput): Promise<PaginatedIncidents>;
  listForPortal(input: ListPortalIncidentsInput): Promise<PaginatedIncidents>;
  getSummary(input: IncidentContext): Promise<IncidentSummaryDto>;
}
