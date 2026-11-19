"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clearSessionAndRetryAction } from "../app/actions/auth";
import {
  mapLoginError,
  shouldOfferSessionRecovery,
} from "../lib/auth/login-recovery";
import { safeNextPath } from "../lib/auth/paths";
import { createBrowserSupabaseClient } from "../lib/supabase/client";
import styles from "./LoginForm.module.css";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error");
  const nextPath = useMemo(
    () => safeNextPath(searchParams.get("next")),
    [searchParams],
  );
  const bootstrapError = useMemo(
    () => mapLoginError(errorCode),
    [errorCode],
  );
  const offerRecovery = useMemo(
    () => shouldOfferSessionRecovery(errorCode),
    [errorCode],
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(bootstrapError);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    startTransition(async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (signInError) {
          setError(signInError.message || "Sign-in failed.");
          return;
        }
        router.replace(nextPath);
        router.refresh();
      } catch {
        setError("Sign-in failed. Check configuration and try again.");
      }
    });
  }

  return (
    <div className={styles.stack}>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <label className={styles.field}>
          <span>Email</span>
          <input
            className={styles.input}
            type="email"
            name="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={pending}
          />
        </label>
        <label className={styles.field}>
          <span>Password</span>
          <input
            className={styles.input}
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            disabled={pending}
          />
        </label>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <button className={styles.submit} type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      {offerRecovery ? (
        <form action={clearSessionAndRetryAction} className={styles.recovery}>
          <p className={styles.recoveryCopy}>
            If you are stuck with an old session while the API is unavailable,
            clear it before retrying.
          </p>
          <button
            type="submit"
            className={styles.recoveryButton}
            disabled={pending}
          >
            Clear session and retry
          </button>
        </form>
      ) : null}
    </div>
  );
}
