export type StoredObject = {
  storageKey: string;
  sizeBytes: number;
};

export type FileStorageContract = {
  save(storageKey: string, data: Buffer): Promise<StoredObject>;
  read(storageKey: string): Promise<Buffer>;
  remove(storageKey: string): Promise<void>;
};
