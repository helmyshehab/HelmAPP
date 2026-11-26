import Link from "next/link";
import type { StaffDemoTripBooking } from "@helm/api-client-ts";
import { BookingConfirmations, type ConfirmationState } from "../../../components/bookings/BookingConfirmations";
import styles from "../../../components/destinations/destinations.module.css";
import { createAuthedHelmClient } from "../../../lib/api/helm-client";
import { requireStaff } from "../../../lib/auth/require-staff";

const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export const metadata = { title: "Demo Bookings — Helm Admin" };

export default async function DemoBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const { accessToken } = await requireStaff();
  const params = await searchParams;
  const id = typeof params.id === "string" ? params.id.trim() : "";
  let items: StaffDemoTripBooking[] = [];
  let error: string | null = null;
  if (Array.isArray(params.id) || (id && !uuid.test(id))) {
    error = "Enter a complete booking ID.";
  } else {
    try {
      const client = createAuthedHelmClient(accessToken);
      ({ items } = await client.listStaffDemoTripBookings(id || undefined));
    } catch {
      error = "Could not load demo bookings. Try again.";
    }
  }

  async function confirmAction(state: ConfirmationState, form: FormData): Promise<ConfirmationState> {
    "use server";
    const staff = await requireStaff();
    const kind = form.get("kind");
    if (!uuid.test(id) || (kind !== "flights" && kind !== "stay" && kind !== "activities")) {
      return { ...state, error: "Select a valid booking service." };
    }
    try {
      const client = createAuthedHelmClient(staff.accessToken);
      const { title, status, services, createdAt } = await client.confirmDemoBookingService(id, kind);
      return { booking: { id, title, status, services, createdAt }, error: null };
    } catch {
      return { ...state, error: "Could not confirm this service. Try again." };
    }
  }

  return (
    <>
      <h1 className={styles.title}>Demo Bookings</h1>
      <form className={styles.filters}>
        <label className={styles.field}>
          <span>Booking ID</span>
          <input className={styles.input} name="id" defaultValue={id} />
        </label>
        <button className={styles.button} type="submit">Find booking</button>
        {id && <Link href="/demo-bookings">Recent bookings</Link>}
      </form>
      {error ? (
        <p role="alert" className={styles.errorBox}>{error}</p>
      ) : items.length === 0 ? (
        <p className={styles.empty}>{id ? "No demo booking matches that ID." : "No demo bookings yet."}</p>
      ) : id ? (
        <BookingConfirmations key={items[0]!.id} booking={items[0]!} confirmAction={confirmAction} />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption>Recent demo bookings</caption>
            <thead><tr><th scope="col">Booking</th><th scope="col">Status</th><th scope="col">Created</th></tr></thead>
            <tbody>
              {items.map((booking) => (
                <tr key={booking.id}>
                  <td>
                    <Link className={styles.rowLink} href={`/demo-bookings?id=${booking.id}`}>
                      {booking.title || "Demo booking"} <code>{booking.id}</code>
                    </Link>
                  </td>
                  <td>{booking.status === "confirmed" ? "Confirmed" : "Pending confirmation"}</td>
                  <td><time dateTime={booking.createdAt}>{booking.createdAt}</time></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
