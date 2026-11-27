import Link from "next/link";
import { notFound } from "next/navigation";
import type { PlaceAdmin } from "@helm/api-client-ts";
import { PlaceCoverPanel } from "../../../../components/places/PlaceCoverPanel";
import { PlaceLifecycleActions } from "../../../../components/places/PlaceLifecycleActions";
import { LifecycleBadge } from "../../../../components/destinations/LifecycleBadge";
import styles from "../../../../components/destinations/destinations.module.css";
import { createAuthedHelmClient } from "../../../../lib/api/helm-client";
import { isAdminPrincipal } from "../../../../lib/auth/staff";
import { requireStaff } from "../../../../lib/auth/require-staff";
import { getPublicAdminEnv } from "../../../../lib/env";
import { placeCoverViewFromMedia } from "../../../../lib/places/cover";
import { parsePlaceApiError } from "../../../../lib/places/errors";
import type { StaffPlaceListItem } from "../../../../lib/places/list-item";
import { resolveStaffPlaceBySlug } from "../../../../lib/places/resolve-by-slug";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return {
    title: `Place ${slug} — Helm حلم Admin`,
  };
}

export default async function PlaceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const { me, accessToken } = await requireStaff();
  const client = createAuthedHelmClient(accessToken);
  const isAdmin = isAdminPrincipal(me);
  const { supabaseUrl } = getPublicAdminEnv();

  let loadError: string | null = null;
  let place: StaffPlaceListItem | null = null;
  let hydrated: PlaceAdmin | null = null;

  try {
    place = await resolveStaffPlaceBySlug(client, slug);
    if (place) {
      hydrated = await client.adminGetCatalogPlace(place.id);
    }
  } catch (error) {
    loadError = parsePlaceApiError(error).message;
  }

  if (!place && !loadError) {
    notFound();
  }

  const cover = hydrated
    ? placeCoverViewFromMedia(hydrated.media, supabaseUrl)
    : null;

  return (
    <div className={styles.stack}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.kicker}>
            <Link href="/places">Places</Link>
          </p>
          <h1 className={styles.title}>{place?.nameEn ?? "Place"}</h1>
          {place ? (
            <p className={styles.subtitle}>
              <LifecycleBadge status={place.lifecycleStatus} />{" "}
              <span className={styles.muted}>{place.slug}</span>
            </p>
          ) : null}
        </div>
      </header>

      {loadError ? (
        <div className={styles.errorBox} role="alert">
          {loadError}
        </div>
      ) : null}

      {place ? (
        <>
          <section className={styles.panel}>
            <h2 className={styles.formSectionTitle}>Summary</h2>
            <ul className={styles.metaList}>
              <li>
                <strong>Name (EN)</strong>
                <span>{place.nameEn}</span>
              </li>
              <li>
                <strong>Name (AR)</strong>
                <span>{place.nameAr}</span>
              </li>
              <li>
                <strong>Category</strong>
                <span>{place.category}</span>
              </li>
              <li>
                <strong>Destination</strong>
                <span>{place.destinationSlug ?? "—"}</span>
              </li>
              <li>
                <strong>Lifecycle</strong>
                <span>
                  <LifecycleBadge status={place.lifecycleStatus} />
                </span>
              </li>
              {place.shortDescriptionEn ? (
                <li>
                  <strong>Short description</strong>
                  <span>{place.shortDescriptionEn}</span>
                </li>
              ) : null}
            </ul>
            <p className={styles.muted}>
              Full place field editing and provenance remain out of scope for
              this slice. Cover photos use the shared catalog-media workflow.
            </p>
          </section>

          <section className={styles.panel}>
            <PlaceCoverPanel
              placeId={place.id}
              isAdmin={isAdmin}
              initialCover={cover}
            />
          </section>

          <section className={styles.panel}>
            <PlaceLifecycleActions
              placeId={place.id}
              status={place.lifecycleStatus}
              isAdmin={isAdmin}
            />
          </section>
        </>
      ) : null}
    </div>
  );
}
