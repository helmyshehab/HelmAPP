import { DiscoverScreen } from "@/components/discover/DiscoverScreen";
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
        <p className="eyebrow">Traveler · Discover</p>
        <h1 className="brand-mark">
          Helm
          <span>حلم · Discover</span>
        </h1>
        <StatusPanel
          title="Discover unavailable"
          body="We could not reach the public Helm catalog. Confirm the local API is running and NEXT_PUBLIC_API_BASE_URL points at it."
        />
      </main>
    );
  }
}
