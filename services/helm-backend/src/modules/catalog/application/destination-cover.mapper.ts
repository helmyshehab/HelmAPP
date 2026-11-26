import type { StoragePort } from '../../../infrastructure/ports/storage.port';

export type DestinationCoverRow = {
  destinationId: string;
  storageBucket: string;
  storagePath: string;
  altTextEn: string | null;
  altTextAr: string | null;
};

export type DestinationCoverPublic = {
  url: string;
  altTextEn?: string;
  altTextAr?: string;
};

/**
 * Resolve a public cover DTO. Never exposes bucket/path or credentials.
 */
export function toPublicDestinationCover(
  row: Pick<DestinationCoverRow, 'storageBucket' | 'storagePath' | 'altTextEn' | 'altTextAr'>,
  storage: Pick<StoragePort, 'publicObjectUrl'>,
): DestinationCoverPublic {
  const altTextEn = row.altTextEn?.trim();
  const altTextAr = row.altTextAr?.trim();
  const cover: DestinationCoverPublic = {
    url: storage.publicObjectUrl(row.storageBucket, row.storagePath),
  };
  if (altTextEn) cover.altTextEn = altTextEn;
  if (altTextAr) cover.altTextAr = altTextAr;
  return cover;
}
