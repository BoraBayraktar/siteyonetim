import bcrypt from "bcryptjs";
import { createAuditService } from "@siteyonetim/platform-audit";

import type {
  BulkImportPartiesInput,
  BulkImportPartiesResult,
  CreatePartyInput,
  DeletePartyInput,
  ExportPartiesExcelInput,
  ExportPartiesExcelResult,
  InvitePortalAccessInput,
  ListPartiesInput,
  PaginatedParties,
  PartyServiceContract,
  UpdatePartyInput,
} from "./contract";
import { PartyRepository, PartyRepositoryTx } from "./repository";
import {
  buildPartiesXlsxBuffer,
  parsePartiesXlsx,
  PARTIES_XLSX_CONTENT_TYPE,
  partiesExportFileName,
} from "./party-excel";
import type { ParsedPartyImportRow } from "./party-import-parse";

const MAX_XLSX_BYTES = 5 * 1024 * 1024;

export class PartyService implements PartyServiceContract {
  constructor(
    private readonly repository = new PartyRepository(),
    private readonly repositoryTx = new PartyRepositoryTx(),
    private readonly audit = createAuditService(),
  ) {}

  async list(input: ListPartiesInput): Promise<PaginatedParties> {
    const { rows, total } = await this.repository.listPaginated(input);
    return { items: rows, total, page: input.page, pageSize: input.pageSize };
  }

  async create(input: CreatePartyInput) {
    const displayName = input.displayName.trim();
    if (!displayName) {
      throw new Error("PARTY_NAME_REQUIRED");
    }

    const created = await this.repository.create({ ...input, displayName });

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "party.create",
      entityType: "Party",
      entityId: created.id,
      metadata: { displayName },
    });

    return created;
  }

  async findOrCreateByDisplayName(input: CreatePartyInput) {
    const displayName = input.displayName.trim();
    if (!displayName) {
      throw new Error("PARTY_NAME_REQUIRED");
    }

    const existing = await this.repository.findAnyByDisplayName(input.organizationId, displayName);
    if (existing && !existing.deleted) {
      return {
        id: existing.id,
        organizationId: existing.organizationId,
        type: existing.type,
        displayName: existing.displayName,
        email: existing.email,
        phone: existing.phone,
        communicationConsent: existing.communicationConsent,
        hasPortalAccess: Boolean(existing.portalUserId),
        activeOccupancyCount: 0,
      };
    }

    return this.create({ ...input, displayName });
  }

  async update(input: UpdatePartyInput) {
    const displayName = input.displayName.trim();
    if (!displayName) {
      throw new Error("PARTY_NAME_REQUIRED");
    }

    try {
      const updated = await this.repository.update({ ...input, displayName });
      if (!updated) {
        throw new Error("PARTY_NOT_FOUND");
      }

      await this.audit.record({
        organizationId: input.organizationId,
        userId: input.actorUserId,
        action: "party.update",
        entityType: "Party",
        entityId: updated.id,
        metadata: { displayName },
      });

      return updated;
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "PARTY_NOT_FOUND" || err.message === "PARTY_EMAIL_LOCKED") {
          throw err;
        }
      }
      if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002") {
        throw new Error("PARTY_EMAIL_EXISTS");
      }
      throw err;
    }
  }

  async bulkImportFromXlsx(input: BulkImportPartiesInput): Promise<BulkImportPartiesResult> {
    if (input.xlsxBuffer.byteLength > MAX_XLSX_BYTES) {
      throw new Error("XLSX_TOO_LARGE");
    }

    const { rows, errors: parseErrors } = await parsePartiesXlsx(input.xlsxBuffer);
    if (parseErrors.includes("XLSX_INVALID")) {
      throw new Error("XLSX_INVALID");
    }
    if (parseErrors.includes("XLSX_EMPTY") || (rows.length === 0 && parseErrors.length === 0)) {
      throw new Error("XLSX_EMPTY");
    }

    return this.importParsedRows(input, rows, parseErrors);
  }

  async exportToXlsx(input: ExportPartiesExcelInput): Promise<ExportPartiesExcelResult> {
    const parties = input.templateOnly
      ? []
      : await this.repository.listAllForOrganization(input.organizationId);

    const buffer = await buildPartiesXlsxBuffer({
      locale: input.locale,
      sheetTitle: input.sheetTitle,
      parties,
      templateOnly: input.templateOnly,
    });

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: input.templateOnly ? "party.exportTemplate" : "party.export",
      entityType: "Organization",
      entityId: input.organizationId,
      metadata: { rowCount: input.templateOnly ? 0 : parties.length },
    });

    return {
      buffer,
      fileName: partiesExportFileName(input.sheetTitle, Boolean(input.templateOnly), input.locale),
      contentType: PARTIES_XLSX_CONTENT_TYPE,
    };
  }

  private async importParsedRows(
    input: BulkImportPartiesInput,
    rows: ParsedPartyImportRow[],
    parseErrors: string[],
  ): Promise<BulkImportPartiesResult> {
    const errors = [...parseErrors];
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      const matchKey = row.email
        ? await this.repository.findAnyByEmail(input.organizationId, row.email)
        : await this.repository.findAnyByDisplayName(input.organizationId, row.displayName);

      try {
        if (matchKey) {
          const party = await this.repository.upsertFromImport(
            {
              organizationId: input.organizationId,
              partyId: matchKey.id,
              type: row.type,
              displayName: row.displayName,
              email: row.email,
              phone: row.phone,
              communicationConsent: row.communicationConsent,
              actorUserId: input.actorUserId,
            },
            matchKey.deleted,
          );
          if (!party) {
            errors.push(`LINE_${row.lineNo}_UPDATE_FAILED`);
            continue;
          }
          updated += 1;
          continue;
        }

        await this.repository.create({
          organizationId: input.organizationId,
          type: row.type,
          displayName: row.displayName,
          email: row.email,
          phone: row.phone,
          communicationConsent: row.communicationConsent,
          actorUserId: input.actorUserId,
        });
        created += 1;
      } catch (err) {
        if (err instanceof Error && err.message === "PARTY_EMAIL_LOCKED") {
          skipped += 1;
          errors.push(`LINE_${row.lineNo}_EMAIL_LOCKED`);
        } else if (
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          (err as { code: string }).code === "P2002"
        ) {
          skipped += 1;
          errors.push(`LINE_${row.lineNo}_DUPLICATE`);
        } else {
          errors.push(`LINE_${row.lineNo}_CREATE_FAILED`);
        }
      }
    }

    if (created > 0 || updated > 0) {
      await this.audit.record({
        organizationId: input.organizationId,
        userId: input.actorUserId,
        action: "party.bulkImport",
        entityType: "Organization",
        entityId: input.organizationId,
        metadata: { created, updated, skipped, errorCount: errors.length },
      });
    }

    return { created, updated, skipped, errors };
  }

  async delete(input: DeletePartyInput) {
    const result = await this.repository.softDelete(input);
    if (result === "not_found") {
      throw new Error("PARTY_NOT_FOUND");
    }
    if (result === "has_occupancy") {
      throw new Error("PARTY_HAS_ACTIVE_OCCUPANCY");
    }

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "party.delete",
      entityType: "Party",
      entityId: input.partyId,
      metadata: {},
    });
  }

  async invitePortalAccess(input: InvitePortalAccessInput) {
    const email = input.email.trim();
    const password = input.password;
    const name = input.name.trim();
    if (!email || !password || password.length < 8) {
      throw new Error("PORTAL_INVITE_INVALID");
    }
    if (!name) {
      throw new Error("PORTAL_NAME_REQUIRED");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const updated = await this.repositoryTx.invitePortal(input, passwordHash);

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "party.portal_invite",
      entityType: "Party",
      entityId: updated.id,
      metadata: { email },
    });

    return updated;
  }
}

export function createPartyService(): PartyService {
  return new PartyService();
}
