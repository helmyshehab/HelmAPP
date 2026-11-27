import { randomUUID } from 'node:crypto';
import { AppException } from '../../common/errors/app.exception';
import {
  CATALOG_COVER_MAX_BYTES,
  CATALOG_COVER_MIME_TYPES,
  CATALOG_MEDIA_BUCKET,
  type CatalogCoverMimeType,
} from '../ports/storage.port';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EXT_BY_MIME: Record<CatalogCoverMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export type ValidatedCatalogCoverImage = {
  mimeType: CatalogCoverMimeType;
  extension: string;
  byteSize: number;
  body: Uint8Array;
};

function isCatalogCoverMime(value: string): value is CatalogCoverMimeType {
  return (CATALOG_COVER_MIME_TYPES as readonly string[]).includes(value);
}

/** Detect image type from magic bytes. Rejects non-images and ambiguous payloads. */
export function detectCatalogCoverMime(body: Uint8Array): CatalogCoverMimeType | null {
  if (body.length < 12) return null;

  // JPEG: FF D8 FF
  if (body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    body[0] === 0x89 &&
    body[1] === 0x50 &&
    body[2] === 0x4e &&
    body[3] === 0x47 &&
    body[4] === 0x0d &&
    body[5] === 0x0a &&
    body[6] === 0x1a &&
    body[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WebP: RIFF....WEBP
  const riff =
    body[0] === 0x52 &&
    body[1] === 0x49 &&
    body[2] === 0x46 &&
    body[3] === 0x46;
  const webp =
    body[8] === 0x57 &&
    body[9] === 0x45 &&
    body[10] === 0x42 &&
    body[11] === 0x50;
  if (riff && webp) return 'image/webp';

  return null;
}

/**
 * Validate cover bytes: size, magic-byte type, optional declared Content-Type match.
 * Does not trust client-declared MIME alone.
 */
export function validateCatalogCoverImage(
  body: Uint8Array,
  declaredContentType?: string | null,
): ValidatedCatalogCoverImage {
  if (!(body instanceof Uint8Array) || body.byteLength === 0) {
    throw AppException.validation('Cover image file is required');
  }
  if (body.byteLength > CATALOG_COVER_MAX_BYTES) {
    throw AppException.validation(
      `Cover image must be at most ${CATALOG_COVER_MAX_BYTES} bytes (5 MiB)`,
    );
  }

  const detected = detectCatalogCoverMime(body);
  if (!detected) {
    throw AppException.validation(
      'Cover image must be a JPEG, PNG, or WebP file (content did not match)',
    );
  }

  if (declaredContentType) {
    const normalized = declaredContentType.split(';')[0]?.trim().toLowerCase() ?? '';
    // Allow image/jpg as a common alias for image/jpeg.
    const declared =
      normalized === 'image/jpg' ? 'image/jpeg' : normalized;
    if (declared && isCatalogCoverMime(declared) && declared !== detected) {
      throw AppException.validation(
        `Cover Content-Type (${declared}) does not match file contents (${detected})`,
      );
    }
    if (declared && !isCatalogCoverMime(declared) && declared !== 'application/octet-stream') {
      throw AppException.validation(
        'Cover image Content-Type must be image/jpeg, image/png, or image/webp',
      );
    }
  }

  return {
    mimeType: detected,
    extension: EXT_BY_MIME[detected],
    byteSize: body.byteLength,
    body,
  };
}

export function assertSafeStorageSegment(value: string, label: string): string {
  const trimmed = value.trim();
  if (!UUID_RE.test(trimmed)) {
    throw AppException.validation(`${label} must be a UUID`);
  }
  return trimmed.toLowerCase();
}

function buildEntityCoverObjectPath(input: {
  entityFolder: 'destinations' | 'places';
  entityId: string;
  entityLabel: string;
  objectId?: string;
  extension: string;
}): string {
  const entityId = assertSafeStorageSegment(input.entityId, input.entityLabel);
  const objectId = assertSafeStorageSegment(
    input.objectId ?? randomUUID(),
    'objectId',
  );
  const ext = input.extension.trim().toLowerCase().replace(/^\./, '');
  if (!/^(jpg|jpeg|png|webp)$/.test(ext)) {
    throw AppException.validation('Cover file extension must be jpg, jpeg, png, or webp');
  }
  const normalizedExt = ext === 'jpeg' ? 'jpg' : ext;
  return `${input.entityFolder}/${entityId}/cover/${objectId}.${normalizedExt}`;
}

/**
 * Safe object path for a destination cover.
 * Shape: destinations/{destinationId}/cover/{objectId}.{ext}
 */
export function buildDestinationCoverObjectPath(input: {
  destinationId: string;
  objectId?: string;
  extension: string;
}): string {
  return buildEntityCoverObjectPath({
    entityFolder: 'destinations',
    entityId: input.destinationId,
    entityLabel: 'destinationId',
    objectId: input.objectId,
    extension: input.extension,
  });
}

/**
 * Safe object path for a place cover.
 * Shape: places/{placeId}/cover/{objectId}.{ext}
 */
export function buildPlaceCoverObjectPath(input: {
  placeId: string;
  objectId?: string;
  extension: string;
}): string {
  return buildEntityCoverObjectPath({
    entityFolder: 'places',
    entityId: input.placeId,
    entityLabel: 'placeId',
    objectId: input.objectId,
    extension: input.extension,
  });
}

export function assertCatalogMediaBucket(bucket: string): string {
  const trimmed = bucket.trim();
  if (trimmed !== CATALOG_MEDIA_BUCKET) {
    throw AppException.validation(
      `Unsupported storage bucket: ${bucket} (expected ${CATALOG_MEDIA_BUCKET})`,
    );
  }
  return trimmed;
}

/** Reject path traversal and absolute paths before talking to storage. */
export function assertSafeObjectPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed.startsWith('/') || trimmed.includes('..') || trimmed.includes('\\')) {
    throw AppException.validation('Invalid storage object path');
  }
  if (!/^[a-z0-9/._-]+$/i.test(trimmed)) {
    throw AppException.validation('Invalid storage object path characters');
  }
  return trimmed;
}
