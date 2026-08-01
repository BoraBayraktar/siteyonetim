import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import type { FileStorageContract, StoredObject } from "./contract";

export type LocalFileStorageOptions = {
  rootDir?: string;
};

function resolveRootDir(options?: LocalFileStorageOptions): string {
  const fromEnv = process.env.DOCUMENT_STORAGE_PATH?.trim();
  if (fromEnv) {
    return path.isAbsolute(fromEnv) ? fromEnv : path.resolve(process.cwd(), fromEnv);
  }
  if (options?.rootDir) {
    return options.rootDir;
  }
  return path.resolve(process.cwd(), "../../storage/documents");
}

export class LocalFileStorage implements FileStorageContract {
  constructor(private readonly rootDir = resolveRootDir()) {}

  private resolvePath(storageKey: string): string {
    const normalized = storageKey.replace(/\\/g, "/");
    if (normalized.includes("..") || path.isAbsolute(normalized)) {
      throw new Error("STORAGE_KEY_INVALID");
    }
    return path.join(this.rootDir, normalized);
  }

  async save(storageKey: string, data: Buffer): Promise<StoredObject> {
    const target = this.resolvePath(storageKey);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, data);
    return { storageKey, sizeBytes: data.byteLength };
  }

  async read(storageKey: string): Promise<Buffer> {
    const target = this.resolvePath(storageKey);
    return readFile(target);
  }

  async remove(storageKey: string): Promise<void> {
    const target = this.resolvePath(storageKey);
    await rm(target, { force: true });
  }
}

export function createLocalFileStorage(options?: LocalFileStorageOptions): LocalFileStorage {
  return new LocalFileStorage(resolveRootDir(options));
}
