"use server";

import { revalidatePath } from "next/cache";
import type {
  LifecycleStatus,
  UpdatePlaceCoverAltRequest,
} from "@helm/api-client-ts";
import { createAuthedHelmClient } from "../../lib/api/helm-client";
import { requireStaff } from "../../lib/auth/require-staff";
import { isAdminPrincipal } from "../../lib/auth/staff";
import {
  COVER_MAX_BYTES,
  validateAltTextAr,
  validateAltTextEn,
  validateCoverFile,
} from "../../lib/destinations/cover";
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

export type PlaceCoverActionResult =
  | { ok: true; id: string; slug: string }
  | PlaceActionFailure;

async function staffClient() {
  const { accessToken } = await requireStaff();
  return createAuthedHelmClient(accessToken);
}

async function requireAdminClient() {
  const { accessToken, me } = await requireStaff();
  if (!isAdminPrincipal(me)) {
    return {
      ok: false as const,
      failure: {
        ok: false as const,
        message: "Administrator authorization is required to manage covers.",
        status: 403,
        kind: "forbidden",
      } satisfies PlaceActionFailure,
    };
  }
  return {
    ok: true as const,
    client: createAuthedHelmClient(accessToken),
  };
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

function revalidatePlace(slug: string) {
  revalidatePath("/places");
  revalidatePath(`/places/${slug}`);
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
    revalidatePlace(updated.slug);
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

export async function uploadPlaceCoverAction(
  placeId: string,
  formData: FormData,
): Promise<PlaceCoverActionResult> {
  const gated = await requireAdminClient();
  if (!gated.ok) return gated.failure;

  const fileValue = formData.get("file");
  const file = fileValue instanceof File ? fileValue : null;
  const fileError = validateCoverFile(file);
  if (fileError || !file) {
    return {
      ok: false,
      message: fileError ?? "Cover image file is required.",
      status: 400,
      kind: "bad_request",
    };
  }
  if (file.size > COVER_MAX_BYTES) {
    return {
      ok: false,
      message: "Cover image must be at most 5 MiB.",
      status: 400,
      kind: "bad_request",
    };
  }

  const altTextEn = String(formData.get("altTextEn") ?? "");
  const altEnError = validateAltTextEn(altTextEn);
  if (altEnError) {
    return {
      ok: false,
      message: altEnError,
      status: 400,
      kind: "bad_request",
    };
  }
  const altTextArRaw = formData.get("altTextAr");
  const altTextAr = typeof altTextArRaw === "string" ? altTextArRaw : "";
  const altArError = validateAltTextAr(altTextAr);
  if (altArError) {
    return {
      ok: false,
      message: altArError,
      status: 400,
      kind: "bad_request",
    };
  }

  try {
    const updated = await gated.client.adminUploadPlaceCover(placeId, {
      file,
      altTextEn: altTextEn.trim(),
      ...(altTextAr.trim() ? { altTextAr: altTextAr.trim() } : {}),
      fileName: file.name || "cover",
    });
    revalidatePlace(updated.slug);
    return { ok: true, id: updated.id, slug: updated.slug };
  } catch (error) {
    return fail(error);
  }
}

export async function updatePlaceCoverAltAction(
  placeId: string,
  body: UpdatePlaceCoverAltRequest,
): Promise<PlaceCoverActionResult> {
  const gated = await requireAdminClient();
  if (!gated.ok) return gated.failure;

  const altEnError = validateAltTextEn(body.altTextEn ?? "");
  if (altEnError) {
    return {
      ok: false,
      message: altEnError,
      status: 400,
      kind: "bad_request",
    };
  }
  const altAr =
    body.altTextAr === null || body.altTextAr === undefined
      ? ""
      : String(body.altTextAr);
  const altArError = validateAltTextAr(altAr);
  if (altArError) {
    return {
      ok: false,
      message: altArError,
      status: 400,
      kind: "bad_request",
    };
  }

  try {
    const updated = await gated.client.adminUpdatePlaceCoverAlt(placeId, {
      altTextEn: (body.altTextEn ?? "").trim(),
      altTextAr: altAr.trim() ? altAr.trim() : null,
    });
    revalidatePlace(updated.slug);
    return { ok: true, id: updated.id, slug: updated.slug };
  } catch (error) {
    return fail(error);
  }
}

export async function deletePlaceCoverAction(
  placeId: string,
): Promise<PlaceCoverActionResult> {
  const gated = await requireAdminClient();
  if (!gated.ok) return gated.failure;

  try {
    const updated = await gated.client.adminDeletePlaceCover(placeId);
    revalidatePlace(updated.slug);
    return { ok: true, id: updated.id, slug: updated.slug };
  } catch (error) {
    return fail(error);
  }
}
