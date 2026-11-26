"use client";

import { useActionState } from "react";
import type { StaffDemoTripBooking } from "@helm/api-client-ts";
import styles from "../destinations/destinations.module.css";

export type ConfirmationState = {
  booking: StaffDemoTripBooking;
  error: string | null;
};

const labels = { flights: "Flights", stay: "Stay", activities: "Activities" };

export function BookingConfirmations({
  booking,
  confirmAction,
}: {
  booking: StaffDemoTripBooking;
  confirmAction: (state: ConfirmationState, form: FormData) => Promise<ConfirmationState>;
}) {
  const [state, submit, pending] = useActionState(confirmAction, { booking, error: null });

  return (
    <section className={styles.panel}>
      <h2>{state.booking.title || "Demo booking"}</h2>
      <p><code>{state.booking.id}</code></p>
      <p>Created <time dateTime={state.booking.createdAt}>{state.booking.createdAt}</time></p>
      <p role="status">
        {pending ? "Confirming service…" : state.booking.status === "confirmed" ? "Confirmed" : "Pending confirmation"}
      </p>
      {state.error && <p role="alert" className={styles.errorBox}>{state.error}</p>}
      <form action={submit}>
        <ul>
          {state.booking.services.map(({ kind, confirmedAt }) => (
            <li key={kind}>
              {labels[kind]}{" "}
              {confirmedAt ? (
                <time dateTime={confirmedAt}>Confirmed {confirmedAt}</time>
              ) : (
                <button className={styles.secondaryButton} name="kind" value={kind} disabled={pending}>
                  Confirm {labels[kind].toLowerCase()}
                </button>
              )}
            </li>
          ))}
        </ul>
      </form>
    </section>
  );
}
