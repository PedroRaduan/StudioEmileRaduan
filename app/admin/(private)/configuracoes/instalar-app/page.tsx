import Link from "next/link";
import { ChevronLeft, Download } from "lucide-react";
import { requireOwner } from "@/lib/auth/session";
import { InstallAppPanel } from "./install-app-panel";

export default async function InstallAppSettingsPage() {
  await requireOwner();

  return (
    <main className="admin-page editor-page">
      <Link className="back-link" href="/admin/configuracoes"><ChevronLeft aria-hidden="true" size={17} />Voltar para configurações</Link>
      <div className="editor-heading"><p className="eyebrow">Aplicativo</p><h1>Tenha a agenda sempre por perto.</h1><p>Instale este painel para abri-lo rapidamente, sem depender de uma aba do navegador.</p></div>
      <section className="editor-card pwa-settings-card">
        <div className="section-inline-heading"><div><p className="eyebrow">Instalação neste dispositivo</p><h2>Usar como aplicativo</h2></div><Download aria-hidden="true" size={23} /></div>
        <InstallAppPanel />
      </section>
    </main>
  );
}
