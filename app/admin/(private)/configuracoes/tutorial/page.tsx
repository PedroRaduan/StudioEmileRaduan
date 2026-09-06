import Link from "next/link";
import { FirstVisitTour } from "@/components/admin/first-visit-tour";
import { requirePermission } from "@/lib/auth/session";
import { getStudioSettings } from "@/lib/admin/settings";

export default async function TutorialPage() {
  const user = await requirePermission("SETTINGS_MANAGE");
  const settings = await getStudioSettings();
  return <main className="admin-page editor-page"><Link className="back-link" href="/admin/configuracoes">← Configurações</Link><header className="editor-heading"><p className="eyebrow">Personalização guiada</p><h1>Experimente antes de aplicar.</h1><p>Veja seu negócio com outras cores e pratique a rotina sem alterar atendimentos reais.</p></header><section className="editor-card"><FirstVisitTour initiallySeen replay studioName={settings?.studioName} primaryColor={settings?.primaryColor} interval={settings?.calendarSlotInterval} mayCustomize={user.role === "OWNER"} /></section></main>;
}
