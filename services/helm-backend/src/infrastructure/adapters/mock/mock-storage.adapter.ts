import { Injectable } from '@nestjs/common';
import type { StoragePort } from '../../ports/storage.port';

/**
 * MOCK storage adapter — returns a non-public placeholder URL.
 * Real Supabase Storage adapter comes later; no paid deps.
 */
@Injectable()
export class MockStorageAdapter implements StoragePort {
  async createSignedDownloadUrl(path: string, expiresInSeconds: number): Promise<string> {
    return `mock://storage/signed?path=${encodeURIComponent(path)}&exp=${expiresInSeconds}`;
  }
}
