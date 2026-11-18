/**
 * Strip staff-only / internal fields from public catalog responses.
 */
const INTERNAL_KEYS = new Set([
  'verified_by',
  'verifiedBy',
  'verified_at',
  'verifiedAt',
  'approved_by',
  'approvedBy',
  'approved_at',
  'approvedAt',
  'rejected_by',
  'rejectedBy',
  'rejected_at',
  'rejectedAt',
  'rejection_reason',
  'rejectionReason',
  'verification_status',
  'verificationStatus',
  'publish_status',
  'publishStatus',
  'external_key',
  'externalKey',
  'lifecycle_status',
  'lifecycleStatus',
]);

export function toPublicPlace(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (INTERNAL_KEYS.has(k)) continue;
    out[k] = v;
  }
  // Public surface uses a single published flag rather than internal lifecycle
  out.status = 'published';
  return out;
}

export function toPublicDestination(row: Record<string, unknown>) {
  return toPublicPlace(row);
}

export function assertNoInternalLeak(payload: unknown): void {
  const text = JSON.stringify(payload);
  for (const key of [
    'rejection_reason',
    'rejectionReason',
    'verified_by',
    'verifiedBy',
    'external_key',
    'externalKey',
  ]) {
    if (text.includes(`"${key}"`)) {
      throw new Error(`Public catalog response leaked internal field: ${key}`);
    }
  }
}
