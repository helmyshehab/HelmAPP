import Link from "next/link";
import styles from "../../../components/destinations/destinations.module.css";
import { createAuthedHelmClient } from "../../../lib/api/helm-client";
import { requireStaff } from "../../../lib/auth/require-staff";

export const metadata = { title: "Packages — Helm Admin" };

export default async function PackagesPage() {
  const { accessToken } = await requireStaff();
  let items: Awaited<ReturnType<ReturnType<typeof createAuthedHelmClient>["adminListPackages"]>>["items"] =
    [];
  let error: string | null = null;
  try {
    const client = createAuthedHelmClient(accessToken);
    ({ items } = await client.adminListPackages());
  } catch {
    error = "Could not load packages. Try again.";
  }

  return (
    <>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.kicker}>Catalog</p>
          <h1 className={styles.title}>Packages</h1>
          <p className={styles.subtitle}>
            Author Ubud trip ideas as versioned Build content. Unpublish before editing a live
            package, then preview and publish.
          </p>
        </div>
        <Link className={styles.primaryLink} href="/packages/new">
          New package
        </Link>
      </header>
      {error ? (
        <p role="alert" className={styles.errorBox}>
          {error}
        </p>
      ) : items.length === 0 ? (
        <p className={styles.empty}>No packages yet.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption>Staff packages</caption>
            <thead>
              <tr>
                <th scope="col">Package</th>
                <th scope="col">Destination</th>
                <th scope="col">Status</th>
                <th scope="col">Content</th>
              </tr>
            </thead>
            <tbody>
              {items.map((pkg) => (
                <tr key={pkg.id}>
                  <td>
                    <Link className={styles.rowLink} href={`/packages/${pkg.id}`}>
                      {pkg.titleEn} <code>{pkg.slug}</code>
                    </Link>
                  </td>
                  <td>{pkg.destinationSlug}</td>
                  <td>{pkg.publishStatus}</td>
                  <td>{pkg.content ? "Build JSON" : "Legacy metadata only"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
