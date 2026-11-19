import Link from "next/link";
import { DestinationForm } from "../../../../components/destinations/DestinationForm";
import styles from "../../../../components/destinations/destinations.module.css";
import { createAuthedHelmClient } from "../../../../lib/api/helm-client";
import { isAdminPrincipal } from "../../../../lib/auth/staff";
import { requireStaff } from "../../../../lib/auth/require-staff";
import { parseApiError } from "../../../../lib/destinations/errors";

export const metadata = {
  title: "New destination — Helm حلم Admin",
};

export default async function NewDestinationPage() {
  const { me, accessToken } = await requireStaff();
  const client = createAuthedHelmClient(accessToken);

  let countries: Array<{ code: string; nameEn: string }> = [];
  let tagOptions: Array<{ slug: string; nameEn: string; nameAr: string }> = [];
  let parents: Array<{ id: string; nameEn: string; slug: string }> = [];
  let loadError: string | null = null;

  try {
    const [countryResult, tagResult, parentResult] = await Promise.all([
      client.listGeoCountries({ active: true, limit: 100 }),
      client.listCatalogTags(),
      client.adminListCatalogDestinations({ limit: 100, offset: 0 }),
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
    parents = parentResult.items.map((item) => ({
      id: item.id,
      nameEn: item.nameEn,
      slug: item.slug,
    }));
  } catch (error) {
    loadError = parseApiError(error).message;
  }

  return (
    <div className={styles.stack}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.kicker}>
            <Link href="/destinations">Destinations</Link>
          </p>
          <h1 className={styles.title}>New destination</h1>
          <p className={styles.subtitle}>
            Creates a draft destination for every staff role. Publish later via
            lifecycle actions.
          </p>
        </div>
      </header>

      <section className={styles.panel}>
        {loadError ? (
          <div className={styles.errorBox} role="alert">
            {loadError}
          </div>
        ) : (
          <DestinationForm
            mode="create"
            isAdmin={isAdminPrincipal(me)}
            countries={countries}
            tagOptions={tagOptions}
            initialParents={parents}
          />
        )}
      </section>
    </div>
  );
}
