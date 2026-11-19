"use server";

import { revalidatePath } from "next/cache";
import type { LifecycleStatus } from "@helm/api-client-ts";
import { createAuthedHelmClient } from "../../lib/api/helm-client";
import { requireStaff } from "../../lib/auth/require-staff";
import { parsePlaceApiError } from "../../lib/places/errors";

export type PlaceActionFailure = {
  ok: false;
  message: string;
  status: number | null;
  kind: string;
};

export type PlaceActionResult =
  | { ok: true; id: string; lifecycleStatus: LifecycleStatus; slug: string }
  | PlaceActionFailure;

async function staffClient() {
  const { accessToken } = await requireStaff();
  return createAuthedHelmClient(accessToken);
}

function fail(error: unknown): PlaceActionFailure {
  const parsed = parsePlaceApiError(error);
  return {
    ok: false,
    message: parsed.message,
    status: parsed.status,
    kind: parsed.kind,
  };
}

export async function transitionPlaceAction(
  id: string,
  to: LifecycleStatus,
  rejectionReason?: string,
): Promise<PlaceActionResult> {
  try {
    const client = await staffClient();
    const updated = await client.adminTransitionCatalogPlace(id, {
      to,
      ...(rejectionReason?.trim()
        ? { rejectionReason: rejectionReason.trim() }
        : {}),
    });
    revalidatePath("/places");
    revalidatePath(`/places/${updated.slug}`);
    return {
      ok: true,
      id: updated.id,
      slug: updated.slug,
      lifecycleStatus: updated.lifecycleStatus,
    };
  } catch (error) {
    return fail(error);
  }
}
