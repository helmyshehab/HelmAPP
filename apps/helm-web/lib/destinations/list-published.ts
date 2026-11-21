import type { DestinationPublic } from "@helm/api-client-ts";

/** Same page size Discover uses for the public catalog. */
export const PUBLISHED_DESTINATION_PAGE_SIZE = 50;

export type DestinationPickerOption = {
  id: string;
  label: string;
};

export type PublishedDestinationCatalog =
  | { ok: true; options: DestinationPickerOption[] }
  | { ok: false; message: string };

export type PublishedDestinationsClient = {
  listDestinations: (params?: {
    limit?: number;
    offset?: number;
  }) => Promise<{
    items?: DestinationPublic[];
    total?: number;
  }>;
};

/**
 * Load every published destination page from the public catalog API.
 * Caller supplies the same public client Discover uses.
 */
export async function listAllPublishedDestinations(
  client: PublishedDestinationsClient,
): Promise<DestinationPublic[]> {
  const all: DestinationPublic[] = [];
  let offset = 0;

  for (;;) {
    const page = await client.listDestinations({
      limit: PUBLISHED_DESTINATION_PAGE_SIZE,
      offset,
    });
    const items = page.items ?? [];
    all.push(...items);

    const total =
      typeof page.total === "number" && Number.isFinite(page.total)
        ? page.total
        : all.length;

    offset += items.length;
    if (items.length === 0 || offset >= total) {
      break;
    }
  }

  return all;
}

export function toDestinationPickerOptions(
  destinations: DestinationPublic[],
): DestinationPickerOption[] {
  return destinations.map((destination) => ({
    id: destination.id,
    label: destinationPickerLabel(destination),
  }));
}

export function destinationPickerLabel(
  destination: Pick<DestinationPublic, "nameEn" | "slug">,
): string {
  const name = destination.nameEn?.trim();
  return name && name.length > 0 ? name : destination.slug;
}

/**
 * Status copy when the saved destination cannot be chosen from published options.
 */
export function destinationCatalogStatusMessage(input: {
  savedDestinationId: string | null;
  catalog: PublishedDestinationCatalog;
}): string | null {
  if (!input.catalog.ok) {
    return `Destination catalog unavailable. The saved destination is preserved so you can still edit the title. ${input.catalog.message}`;
  }

  if (
    input.savedDestinationId &&
    !input.catalog.options.some(
      (option) => option.id === input.savedDestinationId,
    )
  ) {
    return "This draft's destination is no longer published. The saved value is preserved so you can still edit the title, clear it, or choose another published destination.";
  }

  return null;
}
