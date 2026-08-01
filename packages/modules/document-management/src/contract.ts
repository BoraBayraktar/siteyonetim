import type { DocumentCategory, DocumentVisibility } from "@siteyonetim/db";

export type DocumentDto = {
  id: string;
  propertyId: string;
  title: string;
  category: DocumentCategory;
  visibility: DocumentVisibility;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  unitIds: string[];
  createdAt: Date;
};

export type CreateDocumentInput = {
  organizationId: string;
  propertyId: string;
  title: string;
  category: DocumentCategory;
  visibility: DocumentVisibility;
  fileName: string;
  mimeType: string;
  fileBuffer: Buffer;
  unitIds?: string[];
  actorUserId?: string | null;
};

export type ListDocumentsAdminInput = {
  organizationId: string;
  propertyId: string;
  page: number;
  pageSize: number;
};

export type PaginatedDocuments = {
  items: DocumentDto[];
  total: number;
  page: number;
  pageSize: number;
};

export type PortalDocumentScope = {
  propertyId: string;
  unitId: string;
};

export type ListDocumentsPortalInput = {
  organizationId: string;
  scopes: PortalDocumentScope[];
  page: number;
  pageSize: number;
};

export type OpenDocumentDownloadInput = {
  organizationId: string;
  documentId: string;
  sessionKind: "ADMIN" | "PORTAL";
  portalScopes: PortalDocumentScope[];
};

export type DocumentDownloadPayload = {
  fileName: string;
  mimeType: string;
  data: Buffer;
};

export interface DocumentServiceContract {
  create(input: CreateDocumentInput): Promise<DocumentDto>;
  listForAdmin(input: ListDocumentsAdminInput): Promise<PaginatedDocuments>;
  listForPortal(input: ListDocumentsPortalInput): Promise<PaginatedDocuments>;
  openDownload(input: OpenDocumentDownloadInput): Promise<DocumentDownloadPayload>;
}
