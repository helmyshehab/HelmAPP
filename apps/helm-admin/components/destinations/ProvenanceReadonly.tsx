import type { DestinationAdmin } from "@helm/api-client-ts";
import styles from "./destinations.module.css";

type ProvenanceReadonlyProps = {
  sources: NonNullable<DestinationAdmin["sources"]>;
};

export function ProvenanceReadonly({ sources }: ProvenanceReadonlyProps) {
  return (
    <section className={styles.formSection}>
      <h2 className={styles.formSectionTitle}>Provenance</h2>
      {sources.length === 0 ? (
        <p className={styles.muted}>No linked sources yet.</p>
      ) : (
        <ul className={styles.metaList}>
          {sources.map((source) => (
            <li key={source.id}>
              <strong>{source.name}</strong>
              <span className={styles.muted}>{source.sourceType}</span>
              {source.url ? (
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.url}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <p className={styles.muted}>
        Source editing is not available in Step 6.5 (no write API on this
        surface).
      </p>
    </section>
  );
}
