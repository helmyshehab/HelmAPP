"use server";

import { revalidatePath } from "next/cache";
import type { CatalogImportResult } from "@helm/api-client-ts";
import { createAuthedHelmClient } from "../../lib/api/helm-client";
import { isAdminPrincipal } from "../../lib/auth/staff";
import { requireStaff } from "../../lib/auth/require-staff";
import { parseApiError } from "../../lib/destinations/errors";
import {
  parseImportPayloadJson,
  payloadFingerprint,
} from "../../lib/import/payload-summary";

export type ImportActionFailure = {
  ok: false;
  message: string;
  status: number | null;
  kind: string;
};

export type ImportActionSuccess = {
  ok: true;
  result: CatalogImportResult;
};

export type ImportActionResult = ImportActionSuccess | ImportActionFailure;

async function staffClient() {
  const ctx = await requireStaff();
  return {
    ...ctx,
    client: createAuthedHelmClient(ctx.accessToken),
  };
}

function fail(error: unknown): ImportActionFailure {
  const parsed = parseApiError(error);
  let message = parsed.message;
  if (parsed.kind === "bad_request" && error instanceof Error) {
    // Preserve backend validation detail when present in thrown message chain.
    message = error.message.includes("Import validation failed")
      ? error.message.replace(/^.*Import validation failed/, "Import validation failed")
      : parsed.message ===
          "The request was invalid. Check the form fields and try again."
        ? "Import validation failed. Fix the JSON contract issues and dry-run again."
        : parsed.message;
  }
  if (parsed.kind === "forbidden") {
    message =
      "You do not have permission to apply imports. Administrators may apply; operators may dry-run only.";
  }
  if (parsed.kind === "not_found") {
    message = "Import run not found.";
  }
  return {
    ok: false,
    message,
    status: parsed.status,
    kind: parsed.kind,
  };
}

export async function dryRunImportAction(
  rawJson: string,
): Promise<ImportActionResult> {
  const parsed = parseImportPayloadJson(rawJson);
  if (!parsed.ok) {
    return {
      ok: false,
      message: parsed.message,
      status: null,
      kind: "bad_request",
    };
  }

  try {
    const { client } = await staffClient();
    const result = await client.adminImportCatalog({
      dryRun: true,
      payload: parsed.payload as Record<string, unknown>,
    });
    revalidatePath("/import");
    return { ok: true, result };
  } catch (error) {
    return fail(error);
  }
}

/**
 * Apply only after an explicit staff confirmation in the UI.
 * Backend enforces administrator+; frontend gates are UX only.
 */
export async function applyImportAction(
  rawJson: string,
  priorDryRunFingerprint: string,
): Promise<ImportActionResult> {
  const { me, client } = await staffClient();
  if (!isAdminPrincipal(me)) {
    return {
      ok: false,
      message:
        "You do not have permission to apply imports. Administrators may apply; operators may dry-run only.",
      status: 403,
      kind: "forbidden",
    };
  }

  const parsed = parseImportPayloadJson(rawJson);
  if (!parsed.ok) {
    return {
      ok: false,
      message: parsed.message,
      status: null,
      kind: "bad_request",
    };
  }

  if (payloadFingerprint(rawJson) !== priorDryRunFingerprint) {
    return {
      ok: false,
      message:
        "Payload changed since the last dry-run. Run dry-run again before applying.",
      status: null,
      kind: "bad_request",
    };
  }

  try {
    const result = await client.adminImportCatalog({
      dryRun: false,
      payload: parsed.payload as Record<string, unknown>,
    });
    revalidatePath("/import");
    return { ok: true, result };
  } catch (error) {
    return fail(error);
  }
}
