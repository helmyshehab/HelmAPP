/**
 * StoragePort — object storage abstraction.
 * No Supabase SDK in domain; adapters implement this port (REST or mock).
 *
 * Public catalog covers use a public bucket + permanent public URLs.
 * Signed download remains available for future private objects.
 */

export const CATALOG_MEDIA_BUCKET = 'catalog-media';
export const PLACE_COVER_BUCKET = 'catalog-place-covers';
export const PLACE_COVER_URL_TTL_SECONDS = 300;

/** Hard app limit for destination covers (also mirrored on the storage bucket). */
export const CATALOG_COVER_MAX_BYTES = 5 * 1024 * 1024;

export const CATALOG_COVER_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type CatalogCoverMimeType = (typeof CATALOG_COVER_MIME_TYPES)[number];

export type UploadPublicObjectInput = {
  bucket: string;
  path: string;
  body: Uint8Array;
  contentType: string;
  /** When true, overwrite an existing object at the same path. Default false. */
  upsert?: boolean;
};

export type UploadPublicObjectResult = {
  bucket: string;
  path: string;
  publicUrl: string;
  contentType: string;
  byteSize: number;
};

export interface StoragePort {
  createSignedDownloadUrl(path: string, expiresInSeconds: number, bucket?: string): Promise<string>;

  uploadPrivateObject(input: UploadPublicObjectInput): Promise<void>;

  /** Upload bytes to a public bucket and return the permanent public URL. */
  uploadPublicObject(input: UploadPublicObjectInput): Promise<UploadPublicObjectResult>;

  /** Delete a single object. Missing objects are treated as success (idempotent). */
  removeObject(bucket: string, path: string): Promise<void>;

  /** Resolve the permanent public URL for a public-bucket object (no network I/O). */
  publicObjectUrl(bucket: string, path: string): string;
}

export const STORAGE_PORT = Symbol('STORAGE_PORT');
