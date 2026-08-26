export type StorageObjectRef = {
  provider: string;
  providerObjectId: string;
  logicalPath: string;
  mimeType?: string;
  sizeBytes?: number;
};

export interface StorageProvider {
  save(input: { companyId: string; path: string; name: string; bytes: Uint8Array; mimeType?: string }): Promise<StorageObjectRef>;
  get(providerObjectId: string): Promise<Uint8Array>;
  delete(providerObjectId: string): Promise<void>;
}
