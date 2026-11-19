import styles from "../placeholder.module.css";

export const metadata = {
  title: "Import — Helm حلم Admin",
};

export default function ImportPlaceholderPage() {
  return (
    <section className={styles.panel}>
      <p className={styles.kicker}>Step 6.4</p>
      <h1 className={styles.title}>Import</h1>
      <p className={styles.copy}>
        Navigation target for the catalog import workbench. JSON dry-run and
        apply UI ships in Step 6.6.
      </p>
    </section>
  );
}
