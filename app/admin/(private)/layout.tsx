import { requireStaff } from "@/lib/auth/session";
import { AdminShell } from "@/components/admin/shell";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";

export const dynamic = "force-dynamic";

export default async function PrivateAdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const staff = await requireStaff();
  return <AdminShell isTemporary={staff.isTemporary} staffName={staff.name} staffRole={staff.role}>{children}<PwaInstallPrompt /></AdminShell>;
}
