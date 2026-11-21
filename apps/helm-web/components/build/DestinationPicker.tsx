import type { PublishedDestinationCatalog } from "@/lib/destinations/list-published";
import { destinationCatalogStatusMessage } from "@/lib/destinations/list-published";

type DestinationPickerProps = {
  savedDestinationId: string | null;
  value: string;
  catalog: PublishedDestinationCatalog;
  disabled?: boolean;
  onChange: (destinationId: string) => void;
};

/**
 * Labeled destination selector. Values are destination IDs for the draft API.
 * Empty option clears (PATCH null); omitted when unchanged by draft-form.
 */
export function DestinationPicker({
  savedDestinationId,
  value,
  catalog,
  disabled = false,
  onChange,
}: DestinationPickerProps) {
  const statusMessage = destinationCatalogStatusMessage({
    savedDestinationId,
    catalog,
  });

  const publishedOptions = catalog.ok ? catalog.options : [];
  const valueInPublished = publishedOptions.some((option) => option.id === value);
  const showPreservedOption =
    Boolean(value) && !valueInPublished;

  return (
    <label className="build-field">
      <span>Destination</span>
      <select
        className="build-input"
        name="destinationId"
        value={value}
        disabled={disabled || (!catalog.ok && !value)}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">No destination</option>
        {showPreservedOption ? (
          <option value={value}>
            {catalog.ok
              ? "Saved destination (no longer published)"
              : "Saved destination (catalog unavailable)"}
          </option>
        ) : null}
        {publishedOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      {statusMessage ? (
        <p className="build-field-status" role="status">
          {statusMessage}
        </p>
      ) : null}
    </label>
  );
}
