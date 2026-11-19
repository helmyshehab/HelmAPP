import { createAuthedHelmClient } from "../../../lib/api/helm-client";
import { isAdminPrincipal } from "../../../lib/auth/staff";
import { requireStaff } from "../../../lib/auth/require-staff";
import { parseApiError } from "../../../lib/destinations/errors";
import { parseImportHistorySearchParams } from "../../../lib/import/query";
import { ImportHistory } from "../../../components/import/ImportHistory";
import { ImportWorkbench } from "../../../components/import/ImportWorkbench";
import styles from "../../../components/import/import.module.css";

export const metadata = {
  title: "Import — Helm حلم Admin",
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ImportPage({ searchParams }: PageProps) {
  const { me, accessToken } = await requireStaff();
  const client = createAuthedHelmClient(accessToken);
  const params = searchParams ? await searchParams : {};
  const query = parseImportHistorySearchParams(params);
  const canApply = isAdminPrincipal(me);

  let list: Awaited<
    ReturnType<typeof client.adminListCatalogImportRuns>
  > | null = null;
  let listError: string | null = null;
  let detail: Awaited<
    ReturnType<typeof client.adminGetCatalogImportRun>
  > | null = null;
  let detailError: string | null = null;

  try {
    list = await client.adminListCatalogImportRuns({
      status: query.status,
      dryRun: query.dryRun,
      sourceLabel: query.sourceLabel,
      limit: query.limit,
      offset: query.offset,
    });
  } catch (error) {
    listError = parseApiError(error).message;
  }

  if (query.selectedId) {
    try {
      detail = await client.adminGetCatalogImportRun(query.selectedId);
    } catch (error) {
      detailError = parseApiError(error).message;
    }
  }

  return (
    <div className={styles.stack}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.kicker}>Catalog</p>
          <h1 className={styles.title}>Import</h1>
          <p className={styles.subtitle}>
            Dry-run curated <code>helm.catalog.import.v1</code> documents, then
            apply explicitly when authorized. History reflects persisted import
            runs — Asian country/currency seed gaps remain an apply-time
            prerequisite (H-01), not a UI bypass.
          </p>
        </div>
      </header>

      <ImportHistory
        query={query}
        list={list}
        listError={listError}
        detail={detail}
        detailError={detailError}
        isAdmin={canApply}
      />

      <ImportWorkbench canApply={canApply} />
    </div>
  );
}
