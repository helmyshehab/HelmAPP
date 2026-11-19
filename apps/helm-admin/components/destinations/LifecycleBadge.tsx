import type { LifecycleStatus } from "@helm/api-client-ts";
import { lifecycleLabel } from "../../lib/destinations/lifecycle-ui";
import styles from "./destinations.module.css";

const BADGE_CLASS: Partial<Record<LifecycleStatus, string>> = {
  draft: styles.badgeDraft,
  pending_verification: styles.badgePending,
  published: styles.badgePublished,
  rejected: styles.badgeRejected,
  archived: styles.badgeArchived,
};

export function LifecycleBadge({ status }: { status: LifecycleStatus }) {
  const extra = BADGE_CLASS[status] ?? "";
  return (
    <span className={`${styles.badge} ${extra}`.trim()}>
      {lifecycleLabel(status)}
    </span>
  );
}
