import type { PackageAdmin } from "@helm/api-client-ts";
import {
  catalogMediaPublicUrl,
  type DestinationCoverView,
} from "../destinations/cover";

export type PackageCoverView = DestinationCoverView;

type PackageMediaRef = NonNullable<PackageAdmin["media"]>[number];

/** Active cover media ref from staff package hydrate (isCover preferred). */
export function activePackageCover(
  media: PackageAdmin["media"] | undefined | null,
): PackageMediaRef | null {
  const items = media ?? [];
  const cover = items.find((item) => item.isCover === true);
  if (cover) return cover;
  return null;
}

export function packageCoverViewFromMedia(
  media: PackageAdmin["media"] | undefined | null,
  supabaseUrl: string,
  coverPreviewUrl?: string,
): PackageCoverView | null {
  const cover = activePackageCover(media);
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