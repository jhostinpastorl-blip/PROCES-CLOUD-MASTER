import type { StorageObjectRef, StorageProvider } from './provider';

export class GoogleDriveProvider implements StorageProvider {
  async save(): Promise<StorageObjectRef> {
    throw new Error('Google Drive runtime credentials not connected yet.');
  }
  async get(): Promise<Uint8Array> {
    throw new Error('Google Drive runtime credentials not connected yet.');
  }
  async delete(): Promise<void> {
    throw new Error('Google Drive runtime credentials not connected yet.');
  }
}
