import type {
  TripDraft,
  UpdateTripDraftRequest,
} from "@helm/api-client-ts";

/** Editable draft fields supported by the trip-draft API contract. */
export type DraftFormValues = {
  title: string;
  destinationId: string;
  /** JSON object text for `constraints` (full replace when patched). */
  constraintsText: string;
};

export function emptyDraftFormValues(): DraftFormValues {
  return {
    title: "",
    destinationId: "",
    constraintsText: "{}",
  };
}

export function formValuesFromDraft(draft: TripDraft): DraftFormValues {
  return {
    title: draft.title ?? "",
    destinationId: draft.destinationId ?? "",
    constraintsText: stableConstraintsText(draft.constraints),
  };
}

export function stableConstraintsText(
  constraints: TripDraft["constraints"] | null | undefined,
): string {
  const value =
    constraints && typeof constraints === "object" && !Array.isArray(constraints)
      ? constraints
      : {};
  return JSON.stringify(value, null, 2);
}

export type BuildPatchResult =
  | { ok: true; body: UpdateTripDraftRequest }
  | { ok: false; message: string };

/**
 * Build a PATCH body from form values vs the last saved draft.
 * Omitted fields are preserved by the API; explicit null clears nullable fields.
 */
export function buildUpdateTripDraftRequest(
  saved: TripDraft,
  form: DraftFormValues,
): BuildPatchResult {
  const body: UpdateTripDraftRequest = {};

  const nextTitle = normalizeNullableText(form.title);
  if (nextTitle !== (saved.title ?? null)) {
    body.title = nextTitle;
  }

  const nextDestinationId = normalizeNullableText(form.destinationId);
  if (nextDestinationId !== (saved.destinationId ?? null)) {
    body.destinationId = nextDestinationId;
  }

  const parsed = parseConstraintsObject(form.constraintsText);
  if (!parsed.ok) {
    return parsed;
  }

  if (!constraintsEqual(saved.constraints, parsed.value)) {
    body.constraints = parsed.value;
  }

  return { ok: true, body };
}

export function canStartMutation(inFlight: boolean): boolean {
  return !inFlight;
}

function normalizeNullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function parseConstraintsObject(
  text: string,
):
  | { ok: true; value: { [key: string]: unknown } }
  | { ok: false; message: string } {
  const raw = text.trim().length === 0 ? "{}" : text;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, message: "Constraints must be valid JSON." };
  }

  if (
    parsed === null ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    return { ok: false, message: "Constraints must be a JSON object." };
  }

  return { ok: true, value: parsed as { [key: string]: unknown } };
}

function constraintsEqual(
  left: TripDraft["constraints"] | null | undefined,
  right: { [key: string]: unknown },
): boolean {
  const normalizedLeft =
    left && typeof left === "object" && !Array.isArray(left) ? left : {};
  return JSON.stringify(normalizedLeft) === JSON.stringify(right);
}
