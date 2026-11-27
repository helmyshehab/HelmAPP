import Link from "next/link";
import type { StaffTripRequest } from "@helm/api-client-ts";
import { TripRequestReview } from "../../../components/trips/TripRequestReview";
import styles from "../../../components/destinations/destinations.module.css";
import { createAuthedHelmClient } from "../../../lib/api/helm-client";
import { requireStaff } from "../../../lib/auth/require-staff";

const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export const metadata = { title: "Trip Requests — Helm Admin" };

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

export default async function TripRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const { accessToken } = await requireStaff();
  const params = await searchParams;
  const id = typeof params.id === "string" ? params.id.trim() : "";
  let items: StaffTripRequest[] = [];
  let detail: StaffTripRequest | null = null;
  let error: string | null = null;

  if (Array.isArray(params.id) || (id && !uuid.test(id))) {
    error = "Enter a complete trip request ID.";
  } else {
    try {
      const client = createAuthedHelmClient(accessToken);
      if (id) {
        detail = await client.getStaffTripRequest(id);
        items = [detail];
      } else {
        ({ items } = await client.listStaffTripRequests());
      }
    } catch {
      error = id
        ? "Could not load that trip request. Try again."
        : "Could not load trip requests. Try again.";
    }
  }

  return (
    <>
      <h1 className={styles.title}>Trip Requests</h1>
      <p className={styles.subtitle}>
        Review traveler-submitted itineraries. Status moves Submitted → Under review or Declined;
        Declined is final. Staff notes stay staff-only.
      </p>
      <form className={styles.filters}>
        <label className={styles.field}>
          <span>Request ID</span>
          <input className={styles.input} name="id" defaultValue={id} />
        </label>
        <button className={styles.button} type="submit">
          Find request
        </button>
        {id ? <Link href="/trip-requests">Recent requests</Link> : null}
      </form>
      {error ? (
        <p role="alert" className={styles.errorBox}>
          {error}
        </p>
      ) : items.length === 0 ? (
        <p className={styles.empty}>
          {id ? "No trip request matches that ID." : "No trip requests yet."}
        </p>
      ) : detail ? (
        <TripRequestReview key={detail.id} request={detail} />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption>Recent trip requests</caption>
            <thead>
              <tr>
                <th scope="col">Request</th>
                <th scope="col">Destination</th>
                <th scope="col">Status</th>
                <th scope="col">Created</th>
              </tr>
            </thead>
            <tbody>
              {items.map((request) => (
                <tr key={request.id}>
                  <td>
                    <Link
                      className={styles.rowLink}
                      href={`/trip-requests?id=${request.id}`}
                    >
                      {request.title || "Untitled trip"} <code>{request.id}</code>
                    </Link>
                  </td>
                  <td>{request.destinationSlug}</td>
                  <td>{statusLabel(request.status)}</td>
                  <td>
                    <time dateTime={request.createdAt}>{request.createdAt}</time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
