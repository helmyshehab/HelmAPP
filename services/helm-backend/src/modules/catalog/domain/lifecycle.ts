/**
 * Catalog lifecycle transitions (Step 5).
 * Creation never starts as verified/approved/published.
 */

export const LIFECYCLE_STATUSES = [
  'draft',
  'pending_verification',
  'verified',
  'approved',
  'published',
  'rejected',
  'archived',
] as const;

export type LifecycleStatus = (typeof LIFECYCLE_STATUSES)[number];

const ALLOWED: Record<LifecycleStatus, readonly LifecycleStatus[]> = {
  draft: ['pending_verification', 'archived', 'rejected'],
  pending_verification: ['verified', 'rejected', 'draft'],
  verified: ['approved', 'rejected', 'pending_verification'],
  approved: ['published', 'rejected', 'archived'],
  published: ['archived'],
  rejected: ['draft', 'pending_verification', 'archived'],
  archived: ['draft'],
};

/** Staff actions that require administrator+ (operators cannot). */
export const ADMIN_ONLY_TARGETS: readonly LifecycleStatus[] = [
  'verified',
  'approved',
  'published',
  'archived',
];

export function canTransition(
  from: LifecycleStatus,
  to: LifecycleStatus,
): boolean {
  if (from === to) return true;
  return ALLOWED[from].includes(to);
}

export function assertTransition(from: LifecycleStatus, to: LifecycleStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid lifecycle transition: ${from} → ${to}`);
  }
}

export function isPubliclyVisible(status: LifecycleStatus): boolean {
  return status === 'published';
}

export function isCreatableStatus(status: LifecycleStatus): boolean {
  return status === 'draft' || status === 'pending_verification' || status === 'rejected';
}
