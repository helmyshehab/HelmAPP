import Link from "next/link";
import { notFound } from "next/navigation";
import { DestinationForm } from "../../../../components/destinations/DestinationForm";
import { LifecycleActions } from "../../../../components/destinations/LifecycleActions";
import { LifecycleBadge } from "../../../../components/destinations/LifecycleBadge";
import { ProvenanceReadonly } from "../../../../components/destinations/ProvenanceReadonly";
import styles from "../../../../components/destinations/destinations.module.css";
import { createAuthedHelmClient } from "../../../../lib/api/helm-client";
import { isAdminPrincipal } from "../../../../lib/auth/staff";
import { requireStaff } from "../../../../lib/auth/require-staff";
import { parseApiError } from "../../../../lib/destinations/errors";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return {
    title: `Destination ${id.slice(0, 8)} — Helm حلم Admin`,
  };
}

export default async function DestinationDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const createdFlag = Array.isArray(query.created)
    ? query.created[0]
    : query.created;
  const { me, accessToken } = await requireStaff();
  const client = createAuthedHelmClient(accessToken);
  const isAdmin = isAdminPrincipal(me);

  let loadError: string | null = null;
  let destination: Awaited<
    ReturnType<typeof client.adminGetCatalogDestination>
  > | null = null;
  let countries: Array<{ code: string; nameEn: string }> = [];
  let tagOptions: Array<{ slug: string; nameEn: string; nameAr: string }> = [];
  let cities: Array<{ id: string; nameEn: string; countryCode: string }> = [];
  let parents: Array<{ id: string; nameEn: string; slug: string }> = [];

  try {
    destination = await client.adminGetCatalogDestination(id);
  } catch (error) {
    const parsed = parseApiError(error);
    if (parsed.kind === "not_found") {
      notFound();
    }
    loadError = parsed.message;
  }

  if (destination) {
    try {
      const [countryResult, tagResult, cityResult, parentResult] =
        await Promise.all([
          client.listGeoCountries({ active: true, limit: 100 }),
          client.listCatalogTags(),
          client.listGeoCities({
            country: destination.countryCode,
            limit: 100,
          }),
          client.adminListCatalogDestinations({
            country: destination.countryCode,
            limit: 100,
            offset: 0,
          }),
        ]);
      countries = countryResult.items.map((item) => ({
        code: item.code,
        nameEn: item.nameEn,
      }));
      tagOptions = tagResult.items
        .filter((tag) => tag.isActive !== false)
        .map((tag) => ({
          slug: tag.slug,
          nameEn: tag.nameEn,
          nameAr: tag.nameAr,
        }));
      cities = cityResult.items.map((city) => ({
        id: city.id,
        nameEn: city.nameEn,
        countryCode: city.countryCode,
      }));
      parents = parentResult.items
        .filter((item) => item.id !== destination!.id)
        .map((item) => ({
          id: item.id,
          nameEn: item.nameEn,
          slug: item.slug,
        }));
    } catch (error) {
      loadError = parseApiError(error).message;
    }
  }

  return (
    <div className={styles.stack}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.kicker}>
            <Link href="/destinations">Destinations</Link>
          </p>
          <h1 className={styles.title}>
            {destination?.nameEn ?? "Destination"}
          </h1>
          {destination ? (
            <p className={styles.subtitle}>
              <LifecycleBadge status={destination.lifecycleStatus} />{" "}
              <span className={styles.muted}>{destination.slug}</span>
            </p>
          ) : null}
        </div>
      </header>

      {createdFlag === "1" ? (
        <div className={styles.successBox} role="status">
          Draft destination created.
        </div>
      ) : null}

      {loadError ? (
        <div className={styles.errorBox} role="alert">
          {loadError}
        </div>
      ) : null}

      {destination ? (
        <>
          <section className={styles.panel}>
            <DestinationForm
              mode="edit"
              destination={destination}
              isAdmin={isAdmin}
              countries={countries}
              tagOptions={tagOptions}
              initialCities={cities}
              initialParents={parents}
            />
          </section>
          <section className={styles.panel}>
            <LifecycleActions
              destinationId={destination.id}
              status={destination.lifecycleStatus}
              isAdmin={isAdmin}
              rejectionReason={destination.rejectionReason}
              verifiedAt={destination.verifiedAt}
              approvedAt={destination.approvedAt}
              rejectedAt={destination.rejectedAt}
              publishedAt={destination.publishedAt}
              archivedAt={destination.archivedAt}
            />
          </section>
          <section className={styles.panel}>
            <ProvenanceReadonly sources={destination.sources ?? []} />
          </section>
        </>
      ) : null}
    </div>
  );
}
