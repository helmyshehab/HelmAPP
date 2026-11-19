import type { ReactNode } from "react";
import { StaffShell } from "../../components/StaffShell";
import { requireStaff } from "../../lib/auth/require-staff";

export default async function StaffLayout({ children }: { children: ReactNode }) {
  const { me } = await requireStaff();
  return <StaffShell me={me}>{children}</StaffShell>;
}
