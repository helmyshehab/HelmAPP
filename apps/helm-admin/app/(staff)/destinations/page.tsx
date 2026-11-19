import styles from "../placeholder.module.css";

export const metadata = {
  title: "Destinations — Helm حلم Admin",
};

export default function DestinationsPlaceholderPage() {
  return (
    <section className={styles.panel}>
      <p className={styles.kicker}>Step 6.4</p>
      <h1 className={styles.title}>Destinations</h1>
      <p className={styles.copy}>
        Staff shell is ready. Destination list, create, edit, and lifecycle
        screens arrive in Step 6.5.
      </p>
    </section>
  );
}
