import Link from "next/link";
import { ArrowLeft, CalendarOff, Clock3 } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";
import { formatDate, formatTime, todayInTimezone } from "@/lib/date-time";
import { BlockForm, DeleteAvailabilityForm, ExceptionForm } from "./availability-forms";

export default async function AvailabilityOverridesPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await requirePermission("SETTINGS_MANAGE");
  const params = await searchParams;
  const prisma = getPrisma();
  const resource = await prisma.calendarResource.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
  if (!resource) return <main className="admin-page state-page"><CalendarOff size={34} /><h1>Crie a agenda principal primeiro.</h1><Link className="button button-primary" href="/admin/configuracoes/horarios">Configurar agenda</Link></main>;
  const now = new Date();
  const defaultDate = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? params.date! : todayInTimezone();
  const [blocks, exceptions] = await Promise.all([
    prisma.scheduleBlock.findMany({ where: { resourceId: resource.id, endsAt: { gte: now } }, orderBy: { startsAt: "asc" }, take: 30 }),
    prisma.availabilityException.findMany({ where: { resourceId: resource.id, date: { gte: new Date(`${todayInTimezone()}T00:00:00Z`) } }, orderBy: { date: "asc" }, take: 30 }),
  ]);
  return <main className="admin-page settings-page"><Link className="back-link" href="/admin/agenda"><ArrowLeft size={17} /> Voltar para agenda</Link><div className="editor-heading"><p className="eyebrow">Compromissos e exceções</p><h1>Organize trabalho e vida no mesmo lugar.</h1><p>Registre compromissos pessoais, pausas e ausências. Eles bloqueiam o horário sem aparecer para clientes.</p></div><section className="availability-layout"><article className="editor-card"><p className="eyebrow">Novo compromisso</p><BlockForm defaultDate={defaultDate} resourceId={resource.id} /></article><article className="editor-card"><p className="eyebrow">Exceção de uma data</p><ExceptionForm defaultDate={defaultDate} resourceId={resource.id} /></article></section><section className="admin-card availability-list"><div className="card-heading"><div><p className="eyebrow">Próximos compromissos</p><h2>O que foge do horário padrão</h2></div></div>{blocks.length || exceptions.length ? <div className="availability-items">{blocks.map((block) => <article key={block.id}><CalendarOff size={18} /><div><strong>{block.title}</strong><span>{formatDate(block.startsAt, { day: "2-digit", month: "long" })} · {formatTime(block.startsAt)} às {formatTime(block.endsAt)}</span></div><DeleteAvailabilityForm id={block.id} kind="block" /></article>)}{exceptions.map((exception) => <article key={exception.id}><Clock3 size={18} /><div><strong>{exception.isClosed ? "Studio fechado" : "Horário especial"}</strong><span>{formatDate(exception.date, { day: "2-digit", month: "long", timeZone: "UTC" })}{exception.isClosed ? " · dia inteiro" : ` · ${toTime(exception.startsAtMinute)} às ${toTime(exception.endsAtMinute)}`}{exception.note ? ` · ${exception.note}` : ""}</span></div><DeleteAvailabilityForm id={exception.id} kind="exception" /></article>)}</div> : <div className="empty-state"><p>Nenhuma alteração futura.</p><span>A rotina semanal está sendo usada sem exceções.</span></div>}</section></main>;
}

function toTime(value: number | null) { if (value === null) return ""; return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; }
