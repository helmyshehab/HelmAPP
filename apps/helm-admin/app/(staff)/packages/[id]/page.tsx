import Link from "next/link";
import { notFound } from "next/navigation";
import { PackageCoverPanel } from "../../../../components/packages/PackageCoverPanel";
import { PackageEditor } from "../../../../components/packages/PackageEditor";
import styles from "../../../../components/destinations/destinations.module.css";
import { createAuthedHelmClient } from "../../../../lib/api/helm-client";
import { isAdminPrincipal } from "../../../../lib/auth/staff";
import { requireStaff } from "../../../../lib/auth/require-staff";
import { getPublicAdminEnv } from "../../../../lib/env";
import { packageCoverViewFromMedia } from "../../../../lib/packages/cover";

export const metadata = { title: "Edit package — Helm Admin" };

const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export default async function PackageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!uuid.test(id)) notFound();

  const { me, accessToken } = await requireStaff();
  const client = createAuthedHelmClient(accessToken);
  const isAdmin = isAdminPrincipal(me);
  const { supabaseUrl } = getPublicAdminEnv();
  let pkg: Awaited<ReturnType<typeof client.adminGetPackage>>;
  try {
    pkg = await client.adminGetPackage(id);
  } catch {
    notFound();
  }

  let places: { slug: string; nameEn: string; category: string }[] = [];
  try {
    const listed = await client.listCatalogPlaces({
      destinationSlug: pkg.destinationSlug,
      limit: 100,
    });
    places = listed.items.map((place) => ({
      slug: place.slug,
      nameEn: place.nameEn,
      category: place.category,
    }));
  } catch {
    places = [];
  }

  return (
    <>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.kicker}>
            <Link href="/packages">Packages</Link>
          </p>
          <h1 className={styles.title}>{pkg.titleEn}</h1>
          <p className={styles.subtitle}>
            Trip settings → Days → Preview → Publish. Destination{" "}
            <code>{pkg.destinationSlug}</code>.
          </p>
        </div>
      </header>
      <section className={styles.panel}>
        <PackageCoverPanel
          packageId={pkg.id}
          isAdmin={isAdmin}
          initialCover={packageCoverViewFromMedia(
            pkg.media,
            supabaseUrl,
            pkg.coverPreviewUrl,
          )}
        />
      </section>
      <PackageEditor pkg={pkg} places={places} />
    </>
  );
}
