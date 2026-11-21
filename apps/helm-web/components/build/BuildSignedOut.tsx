import Link from "next/link";
import { StatusPanel } from "@/components/discover/StatusPanel";
import { loginRedirectUrl } from "@/lib/auth/paths";

type BuildSignedOutProps = {
  nextPath?: string;
};

export function BuildSignedOut({ nextPath = "/build" }: BuildSignedOutProps) {
  return (
    <>
      <StatusPanel
        title="Sign in to build"
        body="Private trip drafts are saved to your traveler account. Sign in to create, reopen, and edit drafts."
      />
      <p className="build-inline-action">
        <Link href={loginRedirectUrl(nextPath)} className="build-text-link">
          Sign in →
        </Link>
      </p>
    </>
  );
}
