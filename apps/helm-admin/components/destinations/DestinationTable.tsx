import Link from "next/link";
import type { DestinationAdmin } from "@helm/api-client-ts";
import { LifecycleBadge } from "./LifecycleBadge";
import styles from "./destinations.module.css";

export function DestinationTable({ items }: { items: DestinationAdmin[] }) {
  if (items.length === 0) {
    return (
      <div className={styles.empty} role="status">
        No destinations match these filters.
      </div>
    );
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Slug</th>
            <th>Country</th>
            <th>Lifecycle</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <Link
                  href={`/destinations/${item.id}`}
                  className={styles.rowLink}
                >
                  {item.nameEn}
                </Link>
                <div className={styles.muted}>{item.nameAr}</div>
                {item.isFeatured ? (
                  <div className={styles.muted}>Featured</div>
                ) : null}
              </td>
              <td>
                <code>{item.slug}</code>
              </td>
              <td>{item.countryCode}</td>
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
