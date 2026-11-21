"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { safeNextPath } from "@/lib/auth/paths";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function TravelerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(
    () => safeNextPath(searchParams.get("next")),
    [searchParams],
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
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
    <form className="build-form" onSubmit={onSubmit} noValidate>
      <label className="build-field">
        <span>Email</span>
        <input
          className="build-input"
          type="email"
          name="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={pending}
        />
      </label>
      <label className="build-field">
        <span>Password</span>
        <input
          className="build-input"
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
        <p className="build-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="build-button" type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
