import { Suspense } from "react";
import Link from "next/link";
import { TravelerLoginForm } from "@/components/auth/TravelerLoginForm";

export const metadata = {
  title: "Sign in — Helm حلم",
  description: "Sign in to save private trip drafts.",
};

export default function LoginPage() {
  return (
    <main className="shell">
      <p className="eyebrow">Traveler · Sign in</p>
      <h1 className="brand-mark">
        Helm
        <span>حلم · Build</span>
      </h1>
      <p className="lede">
        Sign in with your Supabase email and password to create and reopen
        private trip drafts.
      </p>
      <Suspense fallback={<p className="places-status">Loading…</p>}>
        <TravelerLoginForm />
      </Suspense>
      <p className="build-inline-action">
        <Link href="/build" className="back-link">
          ← Build
        </Link>
      </p>
    </main>
  );
}
