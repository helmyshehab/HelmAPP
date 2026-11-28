import type { DestinationAdmin } from "@helm/api-client-ts";

export const COVER_MAX_BYTES = 5 * 1024 * 1024;
export const COVER_ACCEPT = "image/jpeg,image/png,image/webp";
export const COVER_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

type DestinationMediaRef = NonNullable<DestinationAdmin["media"]>[number];

export type DestinationCoverView = {
  url: string | null;
  altTextEn: string;
  altTextAr: string;
  mediaId?: string;
};

/** Active cover media ref from staff destination hydrate (isCover preferred). */
export function activeDestinationCover(
  media: DestinationAdmin["media"] | undefined | null,
): DestinationMediaRef | null {
  const items = media ?? [];
  const cover = items.find((item) => item.isCover === true);
  if (cover) return cover;
  return null;
}

/**
 * Build permanent public object URL for catalog-media.
 * Uses public Supabase URL only — never service-role credentials.
 */
export function catalogMediaPublicUrl(
  supabaseUrl: string,
  bucket: string,
  path: string,
): string | null {
  const base = supabaseUrl.trim().replace(/\/$/, "");
  const safeBucket = bucket.trim();
  const safePath = path.trim();
  if (!base || safeBucket !== "catalog-media" || !safePath) return null;
  if (safePath.includes("..") || safePath.startsWith("/")) return null;
  try {
    // eslint-disable-next-line no-new
    new URL(base);
  } catch {
    return null;
  }
  const encodedPath = safePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${base}/storage/v1/object/public/${encodeURIComponent(safeBucket)}/${encodedPath}`;
}

export function coverViewFromMedia(
  media: DestinationAdmin["media"] | undefined | null,
  supabaseUrl: string,
  coverPreviewUrl?: string,
): DestinationCoverView | null {
  const cover = activeDestinationCover(media);
  if (!cover) return null;
  return {
    url: coverPreviewUrl ?? catalogMediaPublicUrl(
      supabaseUrl,
      cover.storageBucket,
      cover.storagePath,
    ),
    altTextEn: cover.altTextEn?.trim() ?? "",
    altTextAr: cover.altTextAr?.trim() ?? "",
    mediaId: cover.id,
  };
}

export function validateCoverFile(file: File | null | undefined): string | null {
  if (!file || file.size <= 0) {
    return "Choose a JPEG, PNG, or WebP image.";
  }
  if (file.size > COVER_MAX_BYTES) {
    return "Cover image must be at most 5 MiB.";
  }
  const mime = (file.type || "").split(";")[0]?.trim().toLowerCase() ?? "";
  const normalized = mime === "image/jpg" ? "image/jpeg" : mime;
  if (
    normalized &&
    !(COVER_MIME_TYPES as readonly string[]).includes(normalized)
  ) {
    return "Cover image must be JPEG, PNG, or WebP.";
  }
  // Empty MIME still allowed — server validates magic bytes.
  return null;
}

export function validateAltTextEn(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "English alt text is required.";
  if (trimmed.length > 500) return "English alt text must be at most 500 characters.";
  return null;
}

export function validateAltTextAr(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length > 500) return "Arabic alt text must be at most 500 characters.";
  return null;
}
