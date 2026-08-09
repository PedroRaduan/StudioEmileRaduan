import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCalendarSettings } from "@/lib/admin/settings";
import { calendarSlotInterval } from "@/lib/agenda/timeline";
import { CalendarSettingsForm } from "./calendar-settings-form";

export default async function CalendarSettingsPage() {
  const settings = await getCalendarSettings();

  return (
    <main className="admin-page editor-page">
      <Link className="back-link" href="/admin/configuracoes"><ArrowLeft aria-hidden="true" size={17} /> Voltar para configurações</Link>
      <div className="editor-heading"><p className="eyebrow">Configurações · Agenda</p><h1>A agenda na medida certa.</h1><p>Escolha a distância entre as linhas da visualização diária sem alterar a duração dos seus serviços.</p></div>
      <section className="editor-card"><CalendarSettingsForm interval={calendarSlotInterval(settings?.calendarSlotInterval)} /></section>
    </main>
  );
}
