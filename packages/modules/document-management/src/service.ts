import { DocumentVisibility } from "@siteyonetim/db";
import { createAuditService } from "@siteyonetim/platform-audit";
import { createLocalFileStorage, type FileStorageContract } from "@siteyonetim/platform-files";

import type {
  CreateDocumentInput,
  DocumentDownloadPayload,
  DocumentServiceContract,
  ListBoardMinutesSummaryInput,
  ListDocumentsAdminInput,
  ListDocumentsPortalInput,
  OpenDocumentDownloadInput,
  PaginatedDocuments,
} from "./contract";
import {
  buildStorageKey,
  canAccessDocument,
  DocumentRepository,
  matchesPortalDocumentScope,
} from "./repository";

const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export class DocumentService implements DocumentServiceContract {
  constructor(
    private readonly repository = new DocumentRepository(),
    private readonly storage: FileStorageContract = createLocalFileStorage(),
    private readonly audit = createAuditService(),
  ) {}

  async create(input: CreateDocumentInput) {
    const title = input.title.trim();
    if (!title) {
      throw new Error("DOCUMENT_TITLE_REQUIRED");
    }
    if (!input.fileBuffer.byteLength) {
      throw new Error("DOCUMENT_FILE_REQUIRED");
    }
    if (input.fileBuffer.byteLength > MAX_BYTES) {
      throw new Error("DOCUMENT_FILE_TOO_LARGE");
    }
    if (!ALLOWED_MIME.has(input.mimeType)) {
      throw new Error("DOCUMENT_MIME_NOT_ALLOWED");
    }

    const propertyOk = await this.repository.propertyExists(input.organizationId, input.propertyId);
    if (!propertyOk) {
      throw new Error("PROPERTY_NOT_FOUND");
    }

    if (input.visibility === DocumentVisibility.UNIT_SPECIFIC) {
      const unitIds = input.unitIds ?? [];
      if (unitIds.length === 0) {
        throw new Error("DOCUMENT_UNITS_REQUIRED");
      }
      const unitsOk = await this.repository.unitsInProperty(input.propertyId, unitIds);
      if (!unitsOk) {
        throw new Error("DOCUMENT_UNITS_INVALID");
      }
    }

    const storageKey = buildStorageKey(input.organizationId, input.propertyId, input.fileName);
    await this.storage.save(storageKey, input.fileBuffer);

    try {
      const created = await this.repository.create(input, storageKey, input.fileBuffer.byteLength);
      await this.audit.record({
        organizationId: input.organizationId,
        userId: input.actorUserId,
        action: "document.create",
        entityType: "Document",
        entityId: created.id,
        metadata: {
          propertyId: input.propertyId,
          visibility: input.visibility,
          fileName: created.fileName,
          sizeBytes: created.sizeBytes,
        },
      });
      return created;
    } catch (error) {
      await this.storage.remove(storageKey).catch(() => undefined);
      throw error;
    }
  }

  async listForAdmin(input: ListDocumentsAdminInput): Promise<PaginatedDocuments> {
    const { rows, total } = await this.repository.listForAdmin(input);
    return { items: rows, total, page: input.page, pageSize: input.pageSize };
  }

  async listForPortal(input: ListDocumentsPortalInput): Promise<PaginatedDocuments> {
    const { rows, total } = await this.repository.listForPortal(input);
    return { items: rows, total, page: input.page, pageSize: input.pageSize };
  }

  async listBoardMinutesSummary(input: ListBoardMinutesSummaryInput) {
    return this.repository.listBoardMinutesSummary(input);
  }

  async openDownload(input: OpenDocumentDownloadInput): Promise<DocumentDownloadPayload> {
    const row = await this.repository.findForDownload(input);
    if (!row) {
      throw new Error("DOCUMENT_NOT_FOUND");
    }

    const dto = {
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

    if (!canAccessDocument(dto, input.sessionKind, input.portalScopes)) {
      throw new Error("DOCUMENT_FORBIDDEN");
    }

    const data = await this.storage.read(row.storageKey);
    return {
      fileName: row.fileName,
      mimeType: row.mimeType,
      data,
    };
  }
}

export function createDocumentService(): DocumentService {
  return new DocumentService();
}
