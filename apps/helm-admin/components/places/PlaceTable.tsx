import Link from "next/link";
import { LifecycleBadge } from "../destinations/LifecycleBadge";
import type { StaffPlaceListItem } from "../../lib/places/list-item";
import styles from "../destinations/destinations.module.css";

export function PlaceTable({ items }: { items: StaffPlaceListItem[] }) {
  if (items.length === 0) {
    return (
      <div className={styles.empty} role="status">
        No places match these filters.
      </div>
    );
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Destination</th>
            <th>Lifecycle</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <Link href={`/places/${item.slug}`} className={styles.rowLink}>
                  {item.nameEn}
                </Link>
                <div className={styles.muted}>{item.nameAr}</div>
                <div className={styles.muted}>
                  <code>{item.slug}</code>
                </div>
              </td>
              <td>{item.category}</td>
              <td>
                {item.destinationSlug ? (
                  <code>{item.destinationSlug}</code>
                ) : (
                  "—"
                )}
              </td>
              <td>
                <LifecycleBadge status={item.lifecycleStatus} />
              </td>
              <td className={styles.muted}>
                {item.updatedAt
                  ? new Date(item.updatedAt).toLocaleString()
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
