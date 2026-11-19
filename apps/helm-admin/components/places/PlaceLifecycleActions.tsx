"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { LifecycleStatus } from "@helm/api-client-ts";
import { transitionPlaceAction } from "../../app/actions/places";
import {
  allowedTransitionTargets,
  lifecycleLabel,
  transitionNeedsStrongConfirm,
  transitionRequiresReason,
} from "../../lib/destinations/lifecycle-ui";
import { LifecycleBadge } from "../destinations/LifecycleBadge";
import styles from "../destinations/destinations.module.css";

type PlaceLifecycleActionsProps = {
  placeId: string;
  status: LifecycleStatus;
  isAdmin: boolean;
};

export function PlaceLifecycleActions({
  placeId,
  status,
  isAdmin,
}: PlaceLifecycleActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [reason, setReason] = useState("");
  const [pendingTarget, setPendingTarget] = useState<LifecycleStatus | null>(
    null,
  );

  const targets = allowedTransitionTargets(status, isAdmin);

  function runTransition(to: LifecycleStatus) {
    if (transitionRequiresReason(to) && !reason.trim()) {
      setError("A rejection reason is required.");
      return;
    }
    if (transitionNeedsStrongConfirm(to)) {
      const ok = window.confirm(
        to === "published"
          ? "Publish this place? It will appear on public APIs."
          : "Archive this place?",
      );
      if (!ok) return;
    } else if (to === "rejected") {
      const ok = window.confirm("Reject this place?");
      if (!ok) return;
    }

    setError(null);
    setConflict(false);
    setPendingTarget(to);
    startTransition(async () => {
      const result = await transitionPlaceAction(
        placeId,
        to,
        transitionRequiresReason(to) ? reason : undefined,
      );
      setPendingTarget(null);
      if (!result.ok) {
        setError(result.message);
        setConflict(result.kind === "conflict");
        return;
      }
      setReason("");
      router.refresh();
    });
  }

  return (
    <section className={styles.formSection}>
      <h2 className={styles.formSectionTitle}>Lifecycle</h2>
      <p>
        Current status: <LifecycleBadge status={status} />
      </p>

      {targets.some((to) => transitionRequiresReason(to)) ? (
        <label className={styles.field}>
          <span>Rejection reason</span>
          <textarea
            className={styles.textarea}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={pending}
            placeholder="Required when rejecting"
          />
        </label>
      ) : null}

      {error ? (
        <div className={styles.errorBox} role="alert">
          <p>{error}</p>
          {conflict ? (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => router.refresh()}
            >
              Refresh place
            </button>
          ) : null}
        </div>
      ) : null}

      {targets.length === 0 ? (
        <p className={styles.muted}>No transitions available for your role.</p>
      ) : (
        <div className={styles.lifecycleGrid}>
          {targets.map((to) => (
            <button
              key={to}
              type="button"
              className={
                to === "rejected" || to === "archived"
                  ? styles.dangerButton
                  : styles.button
              }
              disabled={pending}
              onClick={() => runTransition(to)}
            >
              {pending && pendingTarget === to
                ? "Working…"
                : lifecycleLabel(to)}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
