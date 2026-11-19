import type { LifecycleStatus, PlacePublic } from "@helm/api-client-ts";
import { LIFECYCLE_STATUSES } from "../destinations/lifecycle-ui";

/**
 * Staff list responses reuse PlaceListResponse in OpenAPI, but the Nest
 * staff list returns `lifecycleStatus` (not the public `status: published`).
 */
export type StaffPlaceListItem = Omit<PlacePublic, "status"> & {
  lifecycleStatus: LifecycleStatus;
};

function isLifecycleStatus(value: unknown): value is LifecycleStatus {
  return (
    typeof value === "string" &&
    (LIFECYCLE_STATUSES as readonly string[]).includes(value)
  );
}

export function asStaffPlaceListItem(
  item: PlacePublic,
): StaffPlaceListItem | null {
  const raw = item as PlacePublic & {
    lifecycleStatus?: unknown;
  };
  if (!isLifecycleStatus(raw.lifecycleStatus)) {
    return null;
  }
  const { status: _status, ...rest } = raw;
  return {
    ...rest,
    lifecycleStatus: raw.lifecycleStatus,
  };
}

export function mapStaffPlaceListItems(
  items: PlacePublic[],
): StaffPlaceListItem[] {
  const out: StaffPlaceListItem[] = [];
  for (const item of items) {
    const mapped = asStaffPlaceListItem(item);
    if (mapped) out.push(mapped);
  }
  return out;
}
