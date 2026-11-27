import type { PlaceAdmin } from "@helm/api-client-ts";
import {
  catalogMediaPublicUrl,
  type DestinationCoverView,
} from "../destinations/cover";

export type PlaceCoverView = DestinationCoverView;

type PlaceMediaRef = NonNullable<PlaceAdmin["media"]>[number];

/** Active cover media ref from staff place hydrate (isCover preferred). */
export function activePlaceCover(
  media: PlaceAdmin["media"] | undefined | null,
): PlaceMediaRef | null {
  const items = media ?? [];
  const cover = items.find((item) => item.isCover === true);
  if (cover) return cover;
  return null;
}

export function placeCoverViewFromMedia(
  media: PlaceAdmin["media"] | undefined | null,
  supabaseUrl: string,
): PlaceCoverView | null {
  const cover = activePlaceCover(media);
  if (!cover) return null;
  return {
    url: catalogMediaPublicUrl(
      supabaseUrl,
      cover.storageBucket,
      cover.storagePath,
    ),
    altTextEn: cover.altTextEn?.trim() ?? "",
    altTextAr: cover.altTextAr?.trim() ?? "",
    mediaId: cover.id,
  };
}
