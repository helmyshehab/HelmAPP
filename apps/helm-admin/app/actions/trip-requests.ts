"use server";

import { revalidatePath } from "next/cache";
import { createAuthedHelmClient } from "../../lib/api/helm-client";
import { requireStaff } from "../../lib/auth/require-staff";
import { parseApiError } from "../../lib/destinations/errors";

export type TripRequestActionResult =
  | { ok: true }
  | { ok: false; message: string };

export async function updateTripRequestAction(
  id: string,
  status: "under_review" | "declined",
  staffNote?: string | null,
): Promise<TripRequestActionResult> {
  try {
    const { accessToken } = await requireStaff();
    const client = createAuthedHelmClient(accessToken);
    await client.updateStaffTripRequest(id, {
      status,
      ...(staffNote !== undefined ? { staffNote } : {}),
    });
    revalidatePath("/trip-requests");
    return { ok: true };
  } catch (error) {
    return { ok: false, message: parseApiError(error).message };
  }
}
