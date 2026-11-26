"use server";

import { revalidatePath } from "next/cache";
import type {
  CreatePackageRequest,
  PackageAdmin,
  UpdatePackageRequest,
} from "@helm/api-client-ts";
import { createAuthedHelmClient } from "../../lib/api/helm-client";
import { requireStaff } from "../../lib/auth/require-staff";
import { parseApiError } from "../../lib/destinations/errors";

export type PackageActionResult =
  | { ok: true; package: PackageAdmin }
  | { ok: false; message: string };

async function staffClient() {
  const { accessToken } = await requireStaff();
  return createAuthedHelmClient(accessToken);
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
