import { randomUUID } from "node:crypto";
import path from "node:path";

import { createLocalFileStorage, type FileStorageContract } from "@siteyonetim/platform-files";

import { AnnouncementRepository } from "./repository";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const FILE_NAME_PATTERN = /^[a-f0-9-]+\.(jpg|jpeg|png|webp)$/i;

export type UploadAnnouncementImageInput = {
  organizationId: string;
  propertyId: string;
  fileBuffer: Buffer;
  mimeType: string;
};

export type OpenAnnouncementImageInput = {
  organizationId: string;
  propertyId: string;
  fileName: string;
  sessionKind: "ADMIN" | "PORTAL";
  portalPropertyIds: string[];
};

export function buildAnnouncementImageStorageKey(
  organizationId: string,
  propertyId: string,
  fileName: string,
): string {
  return `${organizationId}/${propertyId}/announcements/${fileName}`.replace(/\\/g, "/");
}

function extForMime(mimeType: string): string {
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  throw new Error("ANNOUNCEMENT_IMAGE_MIME_NOT_ALLOWED");
}

function mimeFromExt(ext: string): string {
  const normalized = ext.toLowerCase();
  if (normalized === ".jpg" || normalized === ".jpeg") return "image/jpeg";
  if (normalized === ".png") return "image/png";
  if (normalized === ".webp") return "image/webp";
  throw new Error("ANNOUNCEMENT_IMAGE_NOT_FOUND");
}

export class AnnouncementImageService {
  constructor(
    private readonly repository = new AnnouncementRepository(),
    private readonly storage: FileStorageContract = createLocalFileStorage(),
  ) {}

  async upload(input: UploadAnnouncementImageInput) {
    if (!input.fileBuffer.byteLength) {
      throw new Error("ANNOUNCEMENT_IMAGE_REQUIRED");
    }
    if (input.fileBuffer.byteLength > MAX_BYTES) {
      throw new Error("ANNOUNCEMENT_IMAGE_TOO_LARGE");
    }
    if (!ALLOWED_MIME.has(input.mimeType)) {
      throw new Error("ANNOUNCEMENT_IMAGE_MIME_NOT_ALLOWED");
    }

    const propertyOk = await this.repository.propertyExists(input.organizationId, input.propertyId);
    if (!propertyOk) {
      throw new Error("PROPERTY_NOT_FOUND");
    }

    const assetId = randomUUID();
    const fileName = `${assetId}${extForMime(input.mimeType)}`;
    const storageKey = buildAnnouncementImageStorageKey(input.organizationId, input.propertyId, fileName);
    await this.storage.save(storageKey, input.fileBuffer);

    return {
      url: `/api/properties/${input.propertyId}/announcement-images/${fileName}`,
      fileName,
    };
  }

  async open(input: OpenAnnouncementImageInput) {
    if (!FILE_NAME_PATTERN.test(input.fileName)) {
      throw new Error("ANNOUNCEMENT_IMAGE_NOT_FOUND");
    }

    const propertyOk = await this.repository.propertyExists(input.organizationId, input.propertyId);
    if (!propertyOk) {
      throw new Error("ANNOUNCEMENT_IMAGE_NOT_FOUND");
    }

    if (input.sessionKind === "PORTAL" && !input.portalPropertyIds.includes(input.propertyId)) {
      throw new Error("ANNOUNCEMENT_IMAGE_FORBIDDEN");
    }

    const storageKey = buildAnnouncementImageStorageKey(
      input.organizationId,
      input.propertyId,
      input.fileName,
    );

    try {
      const data = await this.storage.read(storageKey);
      return {
        data,
        mimeType: mimeFromExt(path.extname(input.fileName)),
      };
    } catch {
      throw new Error("ANNOUNCEMENT_IMAGE_NOT_FOUND");
    }
  }
}

export function createAnnouncementImageService(): AnnouncementImageService {
  return new AnnouncementImageService();
}
