import Link from "next/link";
import type { ReactNode } from "react";
import type { MeResponse } from "@helm/api-client-ts";
import { signOutAction } from "../app/actions/auth";
import { primaryStaffRole } from "../lib/auth/staff";
import styles from "./StaffShell.module.css";

const NAV = [
  { href: "/destinations", label: "Destinations" },
  { href: "/places", label: "Places" },
  { href: "/packages", label: "Packages" },
  { href: "/import", label: "Import" },
  { href: "/demo-bookings", label: "Demo Bookings" },
] as const;

type StaffShellProps = {
  me: MeResponse;
  children: ReactNode;
};

export function StaffShell({ me, children }: StaffShellProps) {
  const role = primaryStaffRole(me);

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Staff navigation">
        <div className={styles.brandBlock}>
          <p className={styles.brandMark}>Helm حلم</p>
          <p className={styles.brandSub}>Admin</p>
        </div>
        <nav className={styles.nav}>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={styles.navLink}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className={styles.mainColumn}>
        <header className={styles.topbar}>
          <div className={styles.userMeta}>
            <span className={styles.userEmail}>{me.email ?? me.userId}</span>
            {role ? <span className={styles.userRole}>{role}</span> : null}
          </div>
          <form action={signOutAction}>
            <button type="submit" className={styles.signOut}>
              Sign out
            </button>
          </form>
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
