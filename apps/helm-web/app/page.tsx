import { redirect } from "next/navigation";
import { DiscoverScreen } from "@/components/discover/DiscoverScreen";
import { HelmWordmark } from "@/components/discover/HelmWordmark";
import { StatusPanel } from "@/components/discover/StatusPanel";
import { createPublicHelmClient } from "@/lib/api/helm-client";
import { DISCOVER_PAGE_SIZE } from "@/lib/destinations/discover-page";

type DiscoverPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function parseDiscoverQuery(
  raw: string | string[] | undefined,
): { q?: string; clearEmpty?: boolean } {
  if (raw === undefined) {
    return {};
  }
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined) {
    return {};
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return { clearEmpty: true };
  }
  return { q: trimmed.slice(0, 120) };
}

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const params = searchParams ? await searchParams : {};
  const { q, clearEmpty } = parseDiscoverQuery(params.q);

  if (clearEmpty) {
    redirect("/");
  }

  try {
    const client = createPublicHelmClient();
    const result = await client.listDestinations({
      ...(q ? { q } : {}),
      limit: DISCOVER_PAGE_SIZE,
      offset: 0,
    });
    return (
      <DiscoverScreen
        destinations={result.items ?? []}
        total={result.total ?? 0}
        locale="en"
        query={q}
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
