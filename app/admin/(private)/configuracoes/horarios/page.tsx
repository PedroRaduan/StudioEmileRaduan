import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { getPrimaryResource } from "@/lib/admin/settings";
import { requirePermission } from "@/lib/auth/session";
import { initializeAgendaAction } from "../actions";
import { HoursForm } from "./hours-form";

export default async function HoursPage() {
  await requirePermission("SETTINGS_MANAGE");
  const resource = await getPrimaryResource();
  return <main className="admin-page editor-page"><Link className="back-link" href="/admin/configuracoes"><ArrowLeft size={17} /> Voltar para configurações</Link><div className="editor-heading"><p className="eyebrow">Disponibilidade</p><h1>Defina seu ritmo.</h1><p>Horários fora desta configuração não poderão ser marcados na agenda.</p></div><section className="editor-card">{resource ? <HoursForm resourceId={resource.id} rules={resource.availabilityRules} /> : <div className="setup-notice"><CalendarClock size={24} /><h2>Crie sua agenda principal</h2><p>Ela será usada para guardar sua disponibilidade e todos os atendimentos.</p><form action={initializeAgendaAction}><button className="button button-primary" type="submit">Criar agenda</button></form></div>}</section></main>;
}
