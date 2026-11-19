/**
 * Orchestrates destination edit saves as two separate API steps (PATCH then PUT tags).
 * Does not claim atomicity — callers must surface partial success explicitly.
 */

export type MutationResult =
  | { ok: true }
  | { ok: false; message: string };

export type EditSaveOutcome =
  | { kind: "fields_failed"; message: string }
  | {
      kind: "partial_tags_failed";
      message: string;
      /** Complete intended replacement set (may be empty). */
      intendedTagSlugs: string[];
    }
  | { kind: "success"; message: string };

export type TagRetryOutcome =
  | { kind: "tags_failed"; message: string; intendedTagSlugs: string[] }
  | { kind: "success"; message: string };

export const EDIT_SAVE_MESSAGES = {
  fieldsFailedPrefix: "Destination changes were not saved.",
  partialTagsPrefix:
    "Destination details were saved, but tags were not updated.",
  fullSuccess: "Destination saved.",
  tagsRetrySuccess: "Tags saved. Destination is fully up to date.",
} as const;

export function formatFieldsFailedMessage(apiMessage: string): string {
  const detail = apiMessage.trim();
  return detail
    ? `${EDIT_SAVE_MESSAGES.fieldsFailedPrefix} ${detail}`
    : EDIT_SAVE_MESSAGES.fieldsFailedPrefix;
}

export function formatPartialTagsMessage(apiMessage: string): string {
  const detail = apiMessage.trim();
  return detail
    ? `${EDIT_SAVE_MESSAGES.partialTagsPrefix} ${detail}`
    : EDIT_SAVE_MESSAGES.partialTagsPrefix;
}

/**
 * Run PATCH then PUT. If PATCH fails, PUT is never called.
 */
export async function runEditSaveSequence(input: {
  updateFields: () => Promise<MutationResult>;
  replaceTags: (tagSlugs: string[]) => Promise<MutationResult>;
  tagSlugs: string[];
}): Promise<EditSaveOutcome> {
  const intendedTagSlugs = [...input.tagSlugs];

  const fields = await input.updateFields();
  if (!fields.ok) {
    return {
      kind: "fields_failed",
      message: formatFieldsFailedMessage(fields.message),
    };
  }

  const tags = await input.replaceTags(intendedTagSlugs);
  if (!tags.ok) {
    return {
      kind: "partial_tags_failed",
      message: formatPartialTagsMessage(tags.message),
      intendedTagSlugs,
    };
  }

  return { kind: "success", message: EDIT_SAVE_MESSAGES.fullSuccess };
}

/**
 * Retry tag replacement only (no PATCH).
 */
export async function runTagReplaceRetry(input: {
  replaceTags: (tagSlugs: string[]) => Promise<MutationResult>;
  tagSlugs: string[];
}): Promise<TagRetryOutcome> {
  const intendedTagSlugs = [...input.tagSlugs];
  const tags = await input.replaceTags(intendedTagSlugs);
  if (!tags.ok) {
    return {
      kind: "tags_failed",
      message: formatPartialTagsMessage(tags.message),
      intendedTagSlugs,
    };
  }
  return {
    kind: "success",
    message: EDIT_SAVE_MESSAGES.tagsRetrySuccess,
  };
}

/**
 * Guard against overlapping save/retry requests.
 */
export function canStartMutation(inFlight: boolean): boolean {
  return !inFlight;
}
