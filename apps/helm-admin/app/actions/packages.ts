"use server";

import { revalidatePath } from "next/cache";
import type {
  CreatePackageRequest,
  PackageAdmin,
  UpdatePackageCoverAltRequest,
  UpdatePackageRequest,
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
import { parseApiError } from "../../lib/destinations/errors";

export type PackageActionResult =
  | { ok: true; package: PackageAdmin }
  | { ok: false; message: string };

export type PackageCoverActionResult =
  | { ok: true; package: PackageAdmin }
  | { ok: false; message: string };

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
        message: "Administrator authorization required.",
      },
    };
  }
  return {
    ok: true as const,
    client: createAuthedHelmClient(accessToken),
  };
}

function fail(error: unknown): PackageActionResult {
  return { ok: false, message: parseApiError(error).message };
}

export async function createPackageAction(
  body: CreatePackageRequest,
): Promise<PackageActionResult> {
  try {
    const client = await staffClient();
    const created = await client.adminCreatePackage(body);
    revalidatePath("/packages");
    return { ok: true, package: created };
  } catch (error) {
    return fail(error);
  }
}

export async function updatePackageAction(
  id: string,
  body: UpdatePackageRequest,
): Promise<PackageActionResult> {
  try {
    const client = await staffClient();
    const updated = await client.adminUpdatePackage(id, body);
    revalidatePath("/packages");
    revalidatePath(`/packages/${id}`);
    return { ok: true, package: updated };
  } catch (error) {
    return fail(error);
  }
}

export async function unpublishPackageAction(id: string): Promise<PackageActionResult> {
  try {
    const client = await staffClient();
    const updated = await client.adminUnpublishPackage(id);
    revalidatePath("/packages");
    revalidatePath(`/packages/${id}`);
    return { ok: true, package: updated };
  } catch (error) {
    return fail(error);
  }
}

export async function publishPackageAction(id: string): Promise<PackageActionResult> {
  try {
    const client = await staffClient();
    const updated = await client.adminPublishPackage(id);
    revalidatePath("/packages");
    revalidatePath(`/packages/${id}`);
    return { ok: true, package: updated };
  } catch (error) {
    return fail(error);
  }
}

export async function uploadPackageCoverAction(
  packageId: string,
  formData: FormData,
): Promise<PackageCoverActionResult> {
  const gated = await requireAdminClient();
  if (!gated.ok) return gated.failure;

  const fileValue = formData.get("file");
  const file = fileValue instanceof File ? fileValue : null;
  const fileError = validateCoverFile(file);
  if (fileError || !file) {
    return { ok: false, message: fileError ?? "Cover image file is required." };
  }
  if (file.size > COVER_MAX_BYTES) {
    return { ok: false, message: "Cover image must be at most 5 MiB." };
  }

  const altTextEn = String(formData.get("altTextEn") ?? "");
  const altEnError = validateAltTextEn(altTextEn);
  if (altEnError) {
    return { ok: false, message: altEnError };
  }
  const altTextArRaw = formData.get("altTextAr");
  const altTextAr = typeof altTextArRaw === "string" ? altTextArRaw : "";
  const altArError = validateAltTextAr(altTextAr);
  if (altArError) {
    return { ok: false, message: altArError };
  }

  try {
    const updated = await gated.client.adminUploadPackageCover(packageId, {
      file,
      altTextEn: altTextEn.trim(),
      ...(altTextAr.trim() ? { altTextAr: altTextAr.trim() } : {}),
      fileName: file.name || "cover",
    });
    revalidatePath("/packages");
    revalidatePath(`/packages/${packageId}`);
    return { ok: true, package: updated };
  } catch (error) {
    return fail(error);
  }
}

export async function updatePackageCoverAltAction(
  packageId: string,
  body: UpdatePackageCoverAltRequest,
): Promise<PackageCoverActionResult> {
  const gated = await requireAdminClient();
  if (!gated.ok) return gated.failure;

  const altEnError = validateAltTextEn(body.altTextEn ?? "");
  if (altEnError) {
    return { ok: false, message: altEnError };
  }
  const altAr =
    body.altTextAr === null || body.altTextAr === undefined
      ? ""
      : String(body.altTextAr);
  const altArError = validateAltTextAr(altAr);
  if (altArError) {
    return { ok: false, message: altArError };
  }

  try {
    const updated = await gated.client.adminUpdatePackageCoverAlt(packageId, {
      altTextEn: (body.altTextEn ?? "").trim(),
      altTextAr: altAr.trim() ? altAr.trim() : null,
    });
    revalidatePath("/packages");
    revalidatePath(`/packages/${packageId}`);
    return { ok: true, package: updated };
  } catch (error) {
    return fail(error);
  }
}

export async function deletePackageCoverAction(
  packageId: string,
): Promise<PackageCoverActionResult> {
  const gated = await requireAdminClient();
  if (!gated.ok) return gated.failure;

  try {
    const updated = await gated.client.adminDeletePackageCover(packageId);
    revalidatePath("/packages");
    revalidatePath(`/packages/${packageId}`);
    return { ok: true, package: updated };
  } catch (error) {
    return fail(error);
  }
}
