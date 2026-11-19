import { createAuthedHelmClient } from "../../../lib/api/helm-client";
import { requireStaff } from "../../../lib/auth/require-staff";
import { parsePlaceApiError } from "../../../lib/places/errors";
import { mapStaffPlaceListItems } from "../../../lib/places/list-item";
import { parsePlaceListSearchParams } from "../../../lib/places/query";
import { PlaceFilters } from "../../../components/places/PlaceFilters";
import { PlacePagination } from "../../../components/places/PlacePagination";
import { PlaceTable } from "../../../components/places/PlaceTable";
import styles from "../../../components/destinations/destinations.module.css";

export const metadata = {
  title: "Places — Helm حلم Admin",
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PlacesPage({ searchParams }: PageProps) {
  const { accessToken } = await requireStaff();
  const client = createAuthedHelmClient(accessToken);
  const params = searchParams ? await searchParams : {};
  const query = parsePlaceListSearchParams(params);

  let listError: string | null = null;
  let items: ReturnType<typeof mapStaffPlaceListItems> = [];
  let total = 0;

  try {
    const result = await client.adminListCatalogPlaces({
      q: query.q,
      category: query.category,
      limit: query.limit,
      offset: query.offset,
    });
    items = mapStaffPlaceListItems(result.items);
    total = result.total;
  } catch (error) {
    listError = parsePlaceApiError(error).message;
  }

  return (
    <div className={styles.stack}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.kicker}>Catalog</p>
          <h1 className={styles.title}>Places</h1>
          <p className={styles.subtitle}>
            Search and review catalog places, then advance lifecycle with the
            same staff rules as destinations.
          </p>
        </div>
      </header>

      <section className={styles.panel}>
        <PlaceFilters query={query} />
        {listError ? (
          <div className={styles.errorBox} role="alert">
            {listError}
          </div>
        ) : null}
        {!listError ? (
          <>
            <PlaceTable items={items} />
            <PlacePagination query={query} total={total} />
          </>
        ) : null}
      </section>
    </div>
  );
}
