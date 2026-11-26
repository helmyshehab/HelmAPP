"use client";

import { useState, useTransition } from "react";
import type { StaffTripRequest } from "@helm/api-client-ts";
import { updateTripRequestAction } from "../../app/actions/trip-requests";
import styles from "../destinations/destinations.module.css";

function statusLabel(status: string): string {
  switch (status) {
    case "submitted":
      return "Submitted";
    case "under_review":
      return "Under review";
    case "declined":
      return "Declined";
    default:
      return status;
  }
}

function itinerarySummary(constraints: Record<string, unknown>): string[] {
  const lines: string[] = [];
  const answers = constraints.answers as Record<string, unknown> | undefined;
  const selections = constraints.selections as Record<string, unknown> | undefined;
  const itinerary = constraints.itinerary as
    | { days?: { dayNumber?: number; stopSlugs?: string[] }[] }
    | undefined;
  if (answers) {
    lines.push(
      `Destination: ${String(answers.destination ?? "—")} · ${String(answers.nights ?? "—")} nights · ${String(answers.travelerCount ?? "—")} travelers`,
    );
  }
  if (selections?.hotelSlug) {
    lines.push(`Hotel: ${String(selections.hotelSlug)}`);
  }
  if (Array.isArray(selections?.includedActivitySlugs)) {
    lines.push(
      `Included activities: ${(selections.includedActivitySlugs as string[]).join(", ") || "—"}`,
    );
  }
  for (const day of itinerary?.days ?? []) {
    lines.push(
      `Day ${day.dayNumber ?? "?"}: ${(day.stopSlugs ?? []).join(", ") || "Open time"}`,
    );
  }
  return lines;
}

export function TripRequestReview({ request }: { request: StaffTripRequest }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState(request.staffNote ?? "");
  const declined = request.status === "declined";
  const canReview = request.status === "submitted";
  const canDecline =
    request.status === "submitted" || request.status === "under_review";

  function run(status: "under_review" | "declined") {
    setError(null);
    startTransition(async () => {
      const result = await updateTripRequestAction(
        request.id,
        status,
        note.trim() ? note.trim() : null,
      );
      if (!result.ok) setError(result.message);
    });
  }

  return (
    <div className={styles.stack}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.kicker}>Trip request</p>
          <h2 className={styles.title}>{request.title || "Untitled trip"}</h2>
          <p className={styles.subtitle}>
            {statusLabel(request.status)} · {request.destinationSlug} ·{" "}
            <code>{request.id}</code>
          </p>
        </div>
      </header>
      {error ? (
        <p role="alert" className={styles.errorBox}>
          {error}
        </p>
      ) : null}
      <section className={styles.panel}>
        <h3 className={styles.title}>Submitted itinerary</h3>
        <ul>
          {itinerarySummary(request.constraints).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
      <label className={styles.field}>
        <span>Staff note (staff-only)</span>
        <textarea
          className={styles.input}
          rows={3}
          value={note}
          disabled={declined || pending}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      <div className={styles.actionsRow}>
        {canReview ? (
          <button
            className={styles.button}
            type="button"
            disabled={pending}
            onClick={() => run("under_review")}
          >
            Mark under review
          </button>
        ) : null}
        {canDecline ? (
          <button
            className={styles.button}
            type="button"
            disabled={pending}
            onClick={() => run("declined")}
          >
            Decline
          </button>
        ) : null}
        {declined ? (
          <p className={styles.subtitle}>Declined is final in v1.</p>
        ) : null}
      </div>
    </div>
  );
}
