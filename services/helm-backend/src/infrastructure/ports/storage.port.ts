/**
 * StoragePort — object storage abstraction (private docs via signed URLs later).
 * No Supabase SDK in domain; adapters implement this port.
 */
export interface StoragePort {
  createSignedDownloadUrl(path: string, expiresInSeconds: number): Promise<string>;
}

export const STORAGE_PORT = Symbol('STORAGE_PORT');
