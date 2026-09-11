import Link from "next/link";
import { FirstVisitTour } from "@/components/admin/first-visit-tour";
import { requirePermission } from "@/lib/auth/session";

export default async function TutorialPage() {
  await requirePermission("SETTINGS_MANAGE");
  return <main className="admin-page editor-page"><Link className="back-link" href="/admin/configuracoes">← Configurações</Link><header className="editor-heading"><p className="eyebrow">Ajuda</p><h1>O essencial para começar.</h1><p>Três orientações rápidas sobre agenda, histórico e configurações.</p></header><section className="editor-card"><FirstVisitTour initiallySeen replay /></section></main>;
}
