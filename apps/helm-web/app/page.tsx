import { DiscoverScreen } from "@/components/discover/DiscoverScreen";
import { HelmWordmark } from "@/components/discover/HelmWordmark";
import { StatusPanel } from "@/components/discover/StatusPanel";
import { createPublicHelmClient } from "@/lib/api/helm-client";

export default async function DiscoverPage() {
  try {
    const client = createPublicHelmClient();
    const result = await client.listDestinations({ limit: 50 });
    return (
      <DiscoverScreen
        destinations={result.items ?? []}
        total={result.total ?? 0}
        locale="en"
      />
    );
  } catch {
    return (
      <main className="shell">
        <HelmWordmark />
        <StatusPanel
          title="Discover unavailable"
          body="We could not reach the public Helm catalog. Confirm the local API is running and NEXT_PUBLIC_API_BASE_URL points at it."
        />
      </main>
    );
  }
}
