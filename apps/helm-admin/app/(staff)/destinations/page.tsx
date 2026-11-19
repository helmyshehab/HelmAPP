import Link from "next/link";
import { createAuthedHelmClient } from "../../../lib/api/helm-client";
import { requireStaff } from "../../../lib/auth/require-staff";
import { parseApiError } from "../../../lib/destinations/errors";
import { parseDestinationListSearchParams } from "../../../lib/destinations/query";
import { DestinationFilters } from "../../../components/destinations/DestinationFilters";
import { DestinationPagination } from "../../../components/destinations/DestinationPagination";
import { DestinationTable } from "../../../components/destinations/DestinationTable";
import styles from "../../../components/destinations/destinations.module.css";

export const metadata = {
  title: "Destinations — Helm حلم Admin",
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DestinationsPage({ searchParams }: PageProps) {
  const { accessToken } = await requireStaff();
  const client = createAuthedHelmClient(accessToken);
  const params = searchParams ? await searchParams : {};
  const query = parseDestinationListSearchParams(params);

  let countries: Awaited<
    ReturnType<typeof client.listGeoCountries>
  >["items"] = [];
  let listError: string | null = null;
  let list:
    | Awaited<ReturnType<typeof client.adminListCatalogDestinations>>
    | null = null;

  try {
    const [countryResult, destinationResult] = await Promise.all([
      client.listGeoCountries({ active: true, limit: 100 }),
      client.adminListCatalogDestinations({
        q: query.q,
        country: query.country,
        lifecycleStatus: query.lifecycleStatus,
        featured: query.featured,
        topLevelOnly: query.topLevelOnly,
        limit: query.limit,
        offset: query.offset,
      }),
    ]);
    countries = countryResult.items;
    list = destinationResult;
  } catch (error) {
    listError = parseApiError(error).message;
  }

  return (
    <div className={styles.stack}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.kicker}>Catalog</p>
          <h1 className={styles.title}>Destinations</h1>
          <p className={styles.subtitle}>
            Search, filter, and curate the destination tree. Ordering follows
            the API default (featured first, then slug).
          </p>
        </div>
        <Link className={styles.primaryLink} href="/destinations/new">
          New destination
        </Link>
      </header>

      <section className={styles.panel}>
        <DestinationFilters query={query} countries={countries} />
        {listError ? (
          <div className={styles.errorBox} role="alert">
            {listError}
          </div>
        ) : null}
        {list ? (
          <>
            <DestinationTable items={list.items} />
            <DestinationPagination query={query} total={list.total} />
          </>
        ) : null}
      </section>
    </div>
  );
}
