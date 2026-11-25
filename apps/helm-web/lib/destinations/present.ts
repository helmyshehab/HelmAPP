import type { DestinationPublic } from "@helm/api-client-ts";

/** Detail payloads may include description fields beyond the list schema. */
export type DestinationDetailFields = DestinationPublic & {
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  shortDescriptionEn?: string | null;
  shortDescriptionAr?: string | null;
};

export function formatTagLabel(tag: string): string {
  return tag.replace(/_/g, " ");
}

export function pickPrimaryCopy(destination: DestinationDetailFields): {
  summary: string | null;
  description: string | null;
} {
  const summary =
    nonempty(destination.summaryEn) ??
    nonempty(destination.shortDescriptionEn) ??
    null;
  const description = nonempty(destination.descriptionEn);
  if (description && summary && description === summary) {
    return { summary, description: null };
  }
  return { summary, description };
}

function nonempty(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
