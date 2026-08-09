import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/session";
import { AdminShell } from "@/components/admin/shell";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { PwaRegister } from "@/components/pwa-register";

export const dynamic = "force-dynamic";
// Deployments de preview usam Vercel Authentication. Como a Vercel intercepta
// sub-recursos protegidos antes de eles chegarem ao Next.js, navegadores não
// conseguem concluir a navegação SSO iniciada por um `<link rel="manifest">`.
// O PWA continua integralmente disponível na produção; previews não devem ser
// instaláveis nem registrar service worker com dados administrativos.
const pwaEnabled = process.env.VERCEL_ENV !== "preview";

export const metadata: Metadata = {
  title: "Administração",
  ...(pwaEnabled ? { manifest: "/admin/manifest.webmanifest" } : {}),
  appleWebApp: {
    capable: true,
    title: "Agenda Emile",
    statusBarStyle: "default",
  },
};

export default async function PrivateAdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const staff = await requireStaff();
  return <AdminShell staffName={staff.name} staffRole={staff.role}>{children}{pwaEnabled ? <><PwaRegister /><PwaInstallPrompt /></> : null}</AdminShell>;
}
