import type { LifecycleStatus } from "@helm/api-client-ts";

/**
 * Mirrors Nest catalog lifecycle.ts for UI filtering.
 * Server authorization remains authoritative.
 */

export const LIFECYCLE_STATUSES = [
  "draft",
  "pending_verification",
  "verified",
  "approved",
  "published",
  "rejected",
  "archived",
] as const satisfies readonly LifecycleStatus[];

const ALLOWED: Record<LifecycleStatus, readonly LifecycleStatus[]> = {
  draft: ["pending_verification", "archived", "rejected"],
  pending_verification: ["verified", "rejected", "draft"],
  verified: ["approved", "rejected", "pending_verification"],
  approved: ["published", "rejected", "archived"],
  published: ["archived"],
  rejected: ["draft", "pending_verification", "archived"],
  archived: ["draft"],
};

export const ADMIN_ONLY_TARGETS: readonly LifecycleStatus[] = [
  "verified",
  "approved",
  "published",
  "archived",
];

const CURATABLE: readonly LifecycleStatus[] = [
  "draft",
  "pending_verification",
  "rejected",
];

export function isCuratableStatus(status: LifecycleStatus): boolean {
  return CURATABLE.includes(status);
}

export function canEditDestinationFields(
  status: LifecycleStatus,
  isAdmin: boolean,
): boolean {
  return isAdmin || isCuratableStatus(status);
}

export function isPublishedSlugImmutable(status: LifecycleStatus): boolean {
  return status === "published";
}

export function allowedTransitionTargets(
  from: LifecycleStatus,
  isAdmin: boolean,
): LifecycleStatus[] {
  return ALLOWED[from].filter((to) => {
    if (to === from) return false;
    if (ADMIN_ONLY_TARGETS.includes(to) && !isAdmin) return false;
    if (!isAdmin && !isCuratableStatus(to) && to !== "pending_verification") {
      return false;
    }
    return true;
  });
}

export function transitionRequiresReason(to: LifecycleStatus): boolean {
  return to === "rejected";
}

export function transitionNeedsStrongConfirm(to: LifecycleStatus): boolean {
  return to === "published" || to === "archived";
}

export function lifecycleLabel(status: LifecycleStatus): string {
  return status.replaceAll("_", " ");
}
