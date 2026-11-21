import { createPublicHelmClient } from "../api/helm-client";
import {
  listAllPublishedDestinations,
  toDestinationPickerOptions,
  type PublishedDestinationCatalog,
} from "./list-published";

/** Server helper: public catalog for the Build destination picker. */
export async function loadPublishedDestinationCatalog(): Promise<PublishedDestinationCatalog> {
  try {
    const destinations = await listAllPublishedDestinations(
      createPublicHelmClient(),
    );
    return {
      ok: true,
      options: toDestinationPickerOptions(destinations),
    };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error && err.message
          ? err.message
          : "Could not load the published destination catalog.",
    };
  }
}
