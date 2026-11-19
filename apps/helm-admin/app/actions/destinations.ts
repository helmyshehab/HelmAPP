"use server";

import { revalidatePath } from "next/cache";
import type {
  CreateDestinationRequest,
  DestinationAdmin,
  GeoCityListResponse,
  GeoCountryListResponse,
  LifecycleStatus,
  UpdateDestinationRequest,
} from "@helm/api-client-ts";
import { createAuthedHelmClient } from "../../lib/api/helm-client";
import { requireStaff } from "../../lib/auth/require-staff";
import { parseApiError } from "../../lib/destinations/errors";

type GeoCity = GeoCityListResponse["items"][number];
type GeoCountry = GeoCountryListResponse["items"][number];

export type DestinationActionFailure = {
  ok: false;
  message: string;
  status: number | null;
  kind: string;
};

export type DestinationActionResult =
  | { ok: true; id: string }
  | DestinationActionFailure;

async function staffClient() {
  const { accessToken } = await requireStaff();
  return createAuthedHelmClient(accessToken);
}

function fail(error: unknown): DestinationActionFailure {
  const parsed = parseApiError(error);
  return {
    ok: false,
    message: parsed.message,
    status: parsed.status,
    kind: parsed.kind,
  };
}

export async function createDestinationAction(
  body: CreateDestinationRequest,
): Promise<DestinationActionResult> {
  try {
    const client = await staffClient();
    const created = await client.adminCreateCatalogDestination(body);
    revalidatePath("/destinations");
    return { ok: true, id: created.id };
  } catch (error) {
    return fail(error);
  }
}

export async function updateDestinationAction(
  id: string,
  body: UpdateDestinationRequest,
): Promise<DestinationActionResult> {
  try {
    const client = await staffClient();
    const updated = await client.adminUpdateCatalogDestination(id, body);
    revalidatePath("/destinations");
    revalidatePath(`/destinations/${id}`);
    return { ok: true, id: updated.id };
  } catch (error) {
    return fail(error);
  }
}

export async function replaceDestinationTagsAction(
  id: string,
  tagSlugs: string[],
): Promise<DestinationActionResult> {
  try {
    const client = await staffClient();
    const updated = await client.adminReplaceCatalogDestinationTags(id, {
      tagSlugs,
    });
    revalidatePath(`/destinations/${id}`);
    return { ok: true, id: updated.id };
  } catch (error) {
    return fail(error);
  }
}

export async function transitionDestinationAction(
  id: string,
  to: LifecycleStatus,
  rejectionReason?: string,
): Promise<DestinationActionResult> {
  try {
    const client = await staffClient();
    const updated = await client.adminTransitionCatalogDestination(id, {
      to,
      ...(rejectionReason?.trim()
        ? { rejectionReason: rejectionReason.trim() }
        : {}),
    });
    revalidatePath("/destinations");
    revalidatePath(`/destinations/${id}`);
    return { ok: true, id: updated.id };
  } catch (error) {
    return fail(error);
  }
}

export async function listCitiesForCountryAction(
  countryCode: string,
): Promise<{ ok: true; items: GeoCity[] } | DestinationActionFailure> {
  const code = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    return {
      ok: false,
      message: "Select a country before loading cities.",
      status: 400,
      kind: "bad_request",
    };
  }
  try {
    const client = await staffClient();
    const result = await client.listGeoCities({ country: code, limit: 100 });
    return { ok: true, items: result.items };
  } catch (error) {
    return fail(error);
  }
}

export async function listCountriesAction(): Promise<
  { ok: true; items: GeoCountry[] } | DestinationActionFailure
> {
  try {
    const client = await staffClient();
    const result = await client.listGeoCountries({ active: true, limit: 100 });
    return { ok: true, items: result.items };
  } catch (error) {
    return fail(error);
  }
}

export async function listParentOptionsAction(params?: {
  country?: string;
  excludeId?: string;
}): Promise<{ ok: true; items: DestinationAdmin[] } | DestinationActionFailure> {
  try {
    const client = await staffClient();
    const result = await client.adminListCatalogDestinations({
      country: params?.country,
      limit: 100,
      offset: 0,
    });
    const items = params?.excludeId
      ? result.items.filter((item) => item.id !== params.excludeId)
      : result.items;
    return { ok: true, items };
  } catch (error) {
    return fail(error);
  }
}

export async function listTagOptionsAction(): Promise<
  | { ok: true; items: Array<{ slug: string; nameEn: string; nameAr: string }> }
  | DestinationActionFailure
> {
  try {
    const client = await staffClient();
    const result = await client.listCatalogTags();
    return {
      ok: true,
      items: result.items
        .filter((tag) => tag.isActive !== false)
        .map((tag) => ({
          slug: tag.slug,
          nameEn: tag.nameEn,
          nameAr: tag.nameAr,
        })),
    };
  } catch (error) {
    return fail(error);
  }
}
