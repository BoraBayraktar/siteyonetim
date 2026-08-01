import { createAuditService } from "@siteyonetim/platform-audit";
import { invalidateCachePrefix } from "@siteyonetim/platform-cache";

import type {
  BulkImportUnitsInput,
  BulkImportUnitsResult,
  CreateUnitInput,
  DeleteUnitInput,
  ExportUnitsExcelInput,
  ExportUnitsExcelResult,
  ListUnitsInput,
  PaginatedUnits,
  PropertyUnitScopeInput,
  UnitServiceContract,
  UpdateUnitInput,
} from "./contract";
import { UnitRepository } from "./unit.repository";
import { BlockRepository } from "./block.repository";
import { PropertyScopeRepository } from "./scope.repository";
import {
  buildUnitsXlsxBuffer,
  parseUnitsXlsx,
  UNITS_XLSX_CONTENT_TYPE,
  unitsExportFileName,
} from "./unit-excel";
import type { ParsedUnitImportRow } from "./unit-import-parse";

const CACHE_PREFIX = "unit:list:";
const BLOCK_CACHE_PREFIX = "block:list:";
const MAX_XLSX_BYTES = 5 * 1024 * 1024;

export class UnitService implements UnitServiceContract {
  constructor(
    private readonly repository = new UnitRepository(),
    private readonly blockRepository = new BlockRepository(),
    private readonly scope = new PropertyScopeRepository(),
    private readonly audit = createAuditService(),
  ) {}

  async list(input: ListUnitsInput): Promise<PaginatedUnits> {
    const { rows, total } = await this.repository.listPaginated(input);
    return {
      items: rows,
      total,
      page: input.page,
      pageSize: input.pageSize,
    };
  }

  async create(input: CreateUnitInput) {
    const code = input.code.trim();
    if (!code) {
      throw new Error("UNIT_CODE_REQUIRED");
    }

    const created = await this.repository.create({ ...input, code });
    if (!created) {
      throw new Error("PROPERTY_OR_BLOCK_NOT_FOUND");
    }

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "unit.create",
      entityType: "Unit",
      entityId: created.id,
      metadata: { propertyId: input.propertyId, code },
    });

    await invalidateCachePrefix(`${CACHE_PREFIX}${input.propertyId}:`);
    await invalidateCachePrefix("property:list:");
    return created;
  }

  async update(input: UpdateUnitInput) {
    const code = input.code.trim();
    if (!code) {
      throw new Error("UNIT_CODE_REQUIRED");
    }

    try {
      const updated = await this.repository.update({ ...input, code });
      if (!updated) {
        throw new Error("UNIT_NOT_FOUND");
      }

      await this.audit.record({
        organizationId: input.organizationId,
        userId: input.actorUserId,
        action: "unit.update",
        entityType: "Unit",
        entityId: updated.id,
        metadata: { propertyId: input.propertyId, code },
      });

      await invalidateCachePrefix(`${CACHE_PREFIX}${input.propertyId}:`);
      await invalidateCachePrefix("property:list:");
      return updated;
    } catch (err) {
      if (err instanceof Error && err.message === "UNIT_NOT_FOUND") {
        throw err;
      }
      if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002") {
        throw new Error("UNIT_CODE_EXISTS");
      }
      throw err;
    }
  }

  async bulkImportFromXlsx(input: BulkImportUnitsInput): Promise<BulkImportUnitsResult> {
    const allowed = await this.scope.assertPropertyInOrganization(input.organizationId, input.propertyId);
    if (!allowed) {
      throw new Error("PROPERTY_OR_BLOCK_NOT_FOUND");
    }

    if (input.xlsxBuffer.byteLength > MAX_XLSX_BYTES) {
      throw new Error("XLSX_TOO_LARGE");
    }

    const removedMalformed = await this.cleanupMalformedImportUnits({
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      actorUserId: input.actorUserId,
    });

    const { rows, errors: parseErrors } = await parseUnitsXlsx(input.xlsxBuffer);
    if (parseErrors.includes("XLSX_INVALID")) {
      throw new Error("XLSX_INVALID");
    }
    if (parseErrors.includes("XLSX_EMPTY") || (rows.length === 0 && parseErrors.length === 0)) {
      throw new Error("XLSX_EMPTY");
    }

    return this.importParsedRows(input, rows, parseErrors, removedMalformed);
  }

  async cleanupMalformedImportUnits(input: PropertyUnitScopeInput): Promise<number> {
    const allowed = await this.scope.assertPropertyInOrganization(input.organizationId, input.propertyId);
    if (!allowed) {
      throw new Error("PROPERTY_OR_BLOCK_NOT_FOUND");
    }

    const removed = await this.repository.softDeleteMalformedImportUnits({
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      actorUserId: input.actorUserId,
    });

    if (removed > 0) {
      await this.audit.record({
        organizationId: input.organizationId,
        userId: input.actorUserId,
        action: "unit.cleanupMalformedImport",
        entityType: "Property",
        entityId: input.propertyId,
        metadata: { removed },
      });
      await invalidateCachePrefix(`${CACHE_PREFIX}${input.propertyId}:`);
      await invalidateCachePrefix("property:list:");
    }

    return removed;
  }

  async exportToXlsx(input: ExportUnitsExcelInput): Promise<ExportUnitsExcelResult> {
    const snapshot = await this.repository.listAllForProperty(input.organizationId, input.propertyId);
    if (!snapshot) {
      throw new Error("PROPERTY_OR_BLOCK_NOT_FOUND");
    }

    const buffer = await buildUnitsXlsxBuffer({
      locale: input.locale,
      propertyName: snapshot.propertyName,
      units: snapshot.units,
      templateOnly: input.templateOnly,
    });

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: input.templateOnly ? "unit.exportTemplate" : "unit.export",
      entityType: "Property",
      entityId: input.propertyId,
      metadata: { rowCount: input.templateOnly ? 0 : snapshot.units.length },
    });

    return {
      buffer,
      fileName: unitsExportFileName(snapshot.propertyName, Boolean(input.templateOnly), input.locale),
      contentType: UNITS_XLSX_CONTENT_TYPE,
    };
  }

  private async importParsedRows(
    input: BulkImportUnitsInput,
    rows: ParsedUnitImportRow[],
    parseErrors: string[],
    removedMalformed = 0,
  ): Promise<BulkImportUnitsResult> {
    const errors = [...parseErrors];
    const blocks = await this.repository.listBlocksByProperty(input.propertyId);
    const blockByName = new Map(
      blocks.map((b) => [b.name.trim().replace(/\s+/g, " ").toLowerCase(), b.id]),
    );

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const blockStats = { created: 0 };
    const occupancyAssignments: import("./contract").UnitImportOccupancyAssignment[] = [];

    for (const row of rows) {
      let blockId: string | null = null;
      if (row.blockName) {
        const resolved = await this.resolveBlockForImport(input, row, blockByName, blockStats, errors);
        if (resolved === "skip") {
          continue;
        }
        blockId = resolved;
      }

      const existing = await this.repository.findAnyByCode(input.propertyId, row.code);

      const pushAssignment = (unitId: string) => {
        if (row.ownerName || row.tenantName) {
          occupancyAssignments.push({
            lineNo: row.lineNo,
            unitId,
            ownerName: row.ownerName,
            tenantName: row.tenantName,
          });
        }
      };

      try {
        if (existing) {
          const unit = await this.repository.upsertFromImport(
            {
              organizationId: input.organizationId,
              propertyId: input.propertyId,
              unitId: existing.id,
              blockId,
              code: row.code,
              floor: row.floor,
              areaM2: row.areaM2,
              shareRatio: row.shareRatio,
              actorUserId: input.actorUserId,
            },
            existing.deleted,
          );
          if (!unit) {
            errors.push(`LINE_${row.lineNo}_UPDATE_FAILED`);
            continue;
          }
          updated += 1;
          pushAssignment(unit.id);
          continue;
        }

        const unit = await this.repository.create({
          organizationId: input.organizationId,
          propertyId: input.propertyId,
          blockId,
          code: row.code,
          floor: row.floor,
          areaM2: row.areaM2,
          shareRatio: row.shareRatio,
          actorUserId: input.actorUserId,
        });
        if (!unit) {
          errors.push(`LINE_${row.lineNo}_PROPERTY_NOT_FOUND`);
          continue;
        }
        created += 1;
        pushAssignment(unit.id);
      } catch (err) {
        if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002") {
          const shadow = await this.repository.findAnyByCode(input.propertyId, row.code);
          if (shadow) {
            const unit = await this.repository.upsertFromImport(
              {
                organizationId: input.organizationId,
                propertyId: input.propertyId,
                unitId: shadow.id,
                blockId,
                code: row.code,
                floor: row.floor,
                areaM2: row.areaM2,
                shareRatio: row.shareRatio,
                actorUserId: input.actorUserId,
              },
              true,
            );
            if (unit) {
              updated += 1;
              pushAssignment(unit.id);
              continue;
            }
          }
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
        action: "unit.bulkImport",
        entityType: "Property",
        entityId: input.propertyId,
        metadata: { created, updated, skipped, blocksCreated: blockStats.created, errorCount: errors.length },
      });
      await invalidateCachePrefix(`${CACHE_PREFIX}${input.propertyId}:`);
      await invalidateCachePrefix("property:list:");
      if (blockStats.created > 0) {
        await invalidateCachePrefix(`${BLOCK_CACHE_PREFIX}${input.propertyId}:`);
      }
    }

    return { created, updated, skipped, removedMalformed, errors, occupancyAssignments };
  }

  private async resolveBlockForImport(
    input: BulkImportUnitsInput,
    row: ParsedUnitImportRow,
    blockByName: Map<string, string>,
    blockStats: { created: number },
    errors: string[],
  ): Promise<string | null | "skip"> {
    const name = row.blockName?.trim().replace(/\s+/g, " ") ?? "";
    if (!name) {
      return null;
    }
    const key = name.toLowerCase();
    const cached = blockByName.get(key);
    if (cached) {
      return cached;
    }

    try {
      const created = await this.blockRepository.create({
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        name,
        sortOrder: 0,
        actorUserId: input.actorUserId,
      });
      if (!created) {
        errors.push(`LINE_${row.lineNo}_BLOCK_CREATE_FAILED`);
        return "skip";
      }
      blockByName.set(key, created.id);
      blockStats.created += 1;
      return created.id;
    } catch {
      errors.push(`LINE_${row.lineNo}_BLOCK_NOT_FOUND`);
      return "skip";
    }
  }

  async delete(input: DeleteUnitInput) {
    const ok = await this.repository.softDelete(input);
    if (!ok) {
      throw new Error("UNIT_NOT_FOUND");
    }

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "unit.delete",
      entityType: "Unit",
      entityId: input.unitId,
      metadata: { propertyId: input.propertyId },
    });

    await invalidateCachePrefix(`${CACHE_PREFIX}${input.propertyId}:`);
    await invalidateCachePrefix("property:list:");
  }
}

export function createUnitService(): UnitService {
  return new UnitService();
}
