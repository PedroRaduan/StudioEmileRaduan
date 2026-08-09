import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/session";
import { AdminShell } from "@/components/admin/shell";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { PwaRegister } from "@/components/pwa-register";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Administração",
  manifest: "/admin/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Agenda Emile",
    statusBarStyle: "default",
  },
};

export default async function PrivateAdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const staff = await requireStaff();
  return <AdminShell staffName={staff.name} staffRole={staff.role}>{children}<PwaRegister /><PwaInstallPrompt /></AdminShell>;
}
