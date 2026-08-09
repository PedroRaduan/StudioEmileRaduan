import Link from "next/link";
import { CalendarCheck, CalendarPlus, MessageCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { getCurrentClient } from "@/lib/client-auth/session";
import { getCompletedBookingHold } from "@/lib/client-booking/hold";
import { formatDate, formatTime } from "@/lib/date-time";
import { getPrisma } from "@/lib/db/prisma";
import { whatsappLink } from "@/lib/studio";

export default async function BookingSuccessPage({ searchParams }: { searchParams: Promise<{ appointment?: string }> }) {
  const current = await getCurrentClient();
  const { appointment: id } = await searchParams;
  if (!id) notFound();
  const completedHold = current ? null : await getCompletedBookingHold();
  const [item, settings] = await Promise.all([getPrisma().appointment.findFirst({ where: current ? { id, clientId: current.clientId } : completedHold ? { id, clientId: completedHold.clientId ?? "", requestKey: `hold:${completedHold.id}` } : { id: "__not_found__" }, include: { service: true } }), getPrisma().studioSettings.findUnique({ where: { id: "studio" } })]);
  if (!item) notFound();
  const whatsapp = settings?.whatsapp ? whatsappLink(settings.whatsapp, `Olá! Gostaria de falar sobre o agendamento ${item.code}.`) : null;
  const calendarUrl = calendarLink(item, settings?.addressLine1 ?? "");
  return <main className="booking-success"><CalendarCheck size={48} /><p className="eyebrow">Agendamento confirmado</p><h1>Seu horário foi reservado.</h1><p>{item.service.name} em {formatDate(item.startsAt, { day: "2-digit", month: "long" })}, às {formatTime(item.startsAt)}.</p><span className="appointment-code">Código {item.code}</span>{item.service.beforeCare ? <div className="success-care"><strong>Orientações antes do procedimento</strong><p>{item.service.beforeCare}</p></div> : null}<div className="success-actions"><a className="button button-primary" href={calendarUrl} rel="noreferrer" target="_blank"><CalendarPlus size={18} />Adicionar ao calendário</a>{whatsapp ? <a className="secondary-action" href={whatsapp} rel="noreferrer" target="_blank"><MessageCircle size={18} />Falar no WhatsApp</a> : null}</div><p className="manual-note">O studio visualizará o atendimento na agenda. Lembretes automáticos ainda não estão ativos; o contato será feito manualmente quando necessário.</p>{current ? <Link className="text-link" href="/conta">Ver meus horários</Link> : <Link className="text-link" href="/">Voltar ao site</Link>}</main>;
}

function calendarLink(item: { code: string; startsAt: Date; endsAt: Date; service: { name: string } }, location: string) {
  const utc = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({ action: "TEMPLATE", text: `${item.service.name} — Emile Raduan Beauty Face`, dates: `${utc(item.startsAt)}/${utc(item.endsAt)}`, details: `Agendamento ${item.code}`, location });
  return `https://calendar.google.com/calendar/render?${params}`;
}
