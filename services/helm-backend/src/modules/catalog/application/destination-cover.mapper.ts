export type CatalogCoverRow = {
  storageBucket: string;
  storagePath: string;
  altTextEn: string | null;
  altTextAr: string | null;
};

export type DestinationCoverRow = CatalogCoverRow & {
  destinationId: string;
};

export type PlaceCoverRow = CatalogCoverRow & {
  placeId: string;
};

/** Traveler-facing cover. Never includes storage bucket/path or credentials. */
export type CatalogCoverPublic = {
  url: string;
  altTextEn?: string;
  altTextAr?: string;
};

export type DestinationCoverPublic = CatalogCoverPublic;

/**
 * Resolve a public cover DTO. Never exposes bucket/path or credentials.
 */
export function toPublicCatalogCover(
  row: Pick<CatalogCoverRow, 'storageBucket' | 'storagePath' | 'altTextEn' | 'altTextAr'>,
  url: string,
): CatalogCoverPublic {
  const altTextEn = row.altTextEn?.trim();
  const altTextAr = row.altTextAr?.trim();
  const cover: CatalogCoverPublic = { url };
  if (altTextEn) cover.altTextEn = altTextEn;
  if (altTextAr) cover.altTextAr = altTextAr;
  return cover;
}

/** @deprecated Prefer toPublicCatalogCover — kept for destination call sites. */
export const toPublicDestinationCover = toPublicCatalogCover;
