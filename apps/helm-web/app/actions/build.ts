"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TripDraft } from "@helm/api-client-ts";
import { asHelmApiError } from "../../lib/api/errors";
import {
  buildUpdateTripDraftRequest,
  type DraftFormValues,
} from "../../lib/build/draft-form";
import {
  createBootstrappedTravelerClient,
  getTravelerSession,
} from "../../lib/auth/require-traveler";

export type BuildMutationResult =
  | { ok: true; draft: TripDraft }
  | { ok: false; message: string; signedOut?: boolean };

export async function createTripDraftAction(): Promise<void> {
  const session = await getTravelerSession();
  if (!session) {
    redirect("/login?next=/build");
  }

  const client = await createBootstrappedTravelerClient(session.accessToken);
  const draft = await client.createTripDraft({}, session.accessToken);
  revalidatePath("/build");
  redirect(`/build/${draft.id}`);
}

export async function saveTripDraftAction(input: {
  draftId: string;
  form: DraftFormValues;
  /** Last known saved draft — used to omit unchanged PATCH fields. */
  saved: TripDraft;
}): Promise<BuildMutationResult> {
  const session = await getTravelerSession();
  if (!session) {
    return {
      ok: false,
      message: "Sign in to save this draft.",
      signedOut: true,
    };
  }

  const patch = buildUpdateTripDraftRequest(input.saved, input.form);
  if (!patch.ok) {
    return { ok: false, message: patch.message };
  }

  try {
    const client = await createBootstrappedTravelerClient(session.accessToken);
    const draft =
      Object.keys(patch.body).length === 0
        ? await client.getTripDraft(input.draftId, session.accessToken)
        : await client.updateTripDraft(
            input.draftId,
            patch.body,
            session.accessToken,
          );
    revalidatePath("/build");
    revalidatePath(`/build/${input.draftId}`);
    return { ok: true, draft };
  } catch (err) {
    const api = asHelmApiError(err);
    if (api?.status === 404) {
      return { ok: false, message: "Draft not found." };
    }
    if (api?.status === 401) {
      return {
        ok: false,
        message: "Sign in to save this draft.",
        signedOut: true,
      };
    }
    return {
      ok: false,
      message:
        err instanceof Error && err.message
          ? err.message
          : "Could not save draft.",
    };
  }
}
