import { Suspense } from "react";
import { LoginForm } from "../../components/LoginForm";
import styles from "./login.module.css";

export const metadata = {
  title: "Sign in — Helm حلم Admin",
};

export default function LoginPage() {
  return (
    <div className={styles.page}>
      <section className={styles.panel} aria-labelledby="login-heading">
        <p className={styles.eyebrow}>Staff access</p>
        <h1 id="login-heading" className={styles.brand}>
          Helm حلم Admin
        </h1>
        <p className={styles.lede}>
          Sign in with your Supabase email and password. Authorization is
          verified by the Helm API using database roles.
        </p>
        <Suspense fallback={<p className={styles.loading}>Loading…</p>}>
          <LoginForm />
        </Suspense>
      </section>
    </div>
  );
}
