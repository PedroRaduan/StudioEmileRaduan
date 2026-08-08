import Link from "next/link";
import { AlertCircle, Clock3, MessageCircle, ShieldCheck } from "lucide-react";
import { validActionToken } from "@/lib/client-booking/action-tokens";
import { formatDate, formatTime } from "@/lib/date-time";
import { getPrisma } from "@/lib/db/prisma";
import { whatsappLink } from "@/lib/studio";
import { AppointmentLinkActionForm } from "./action-form";

const titles = { CONFIRM: "Confirmar presença", CANCEL: "Cancelar agendamento", RESCHEDULE: "Solicitar reagendamento" } as const;

export default async function AppointmentActionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token: rawToken } = await params;
  const [token, settings] = await Promise.all([validActionToken(rawToken), getPrisma().studioSettings.findUnique({ where: { id: "studio" } })]);
  const whatsapp = settings?.whatsapp ? whatsappLink(settings.whatsapp, "Olá! Preciso de ajuda com meu agendamento.") : null;
  if (!token || token.usedAt || token.expiresAt <= new Date()) return <main className="link-action-page"><AlertCircle size={38} /><p className="eyebrow">Link indisponível</p><h1>Este link expirou ou já foi utilizado.</h1><p>Para proteger seus dados, cada link funciona uma única vez e somente até o horário do atendimento.</p>{whatsapp ? <a className="button button-primary" href={whatsapp} rel="noreferrer" target="_blank"><MessageCircle size={18} />Falar com o studio</a> : <Link className="secondary-action" href="/">Voltar ao site</Link>}</main>;
  const appointment = token.appointment;
  const hoursUntil = (appointment.startsAt.getTime() - new Date().getTime()) / (60 * 60 * 1000);
  const outsideWindow = token.purpose === "CANCEL" ? hoursUntil < (settings?.cancellationHours ?? 24) : token.purpose === "RESCHEDULE" ? hoursUntil < (settings?.rescheduleHours ?? 24) : false;
  return <main className="link-action-page"><Link className="wordmark" href="/">Emile Raduan<small>Beauty Face</small></Link><div className="link-action-heading"><p className="eyebrow"><ShieldCheck size={14} />Link seguro</p><h1>{titles[token.purpose]}</h1><p>Olá, {appointment.client.preferredName ?? appointment.client.fullName.split(" ")[0]}. Confira os dados antes de continuar.</p></div><section className="link-appointment-summary"><strong>{appointment.service.name}</strong><span><Clock3 size={16} />{formatDate(appointment.startsAt, { weekday: "long", day: "2-digit", month: "long" })}, às {formatTime(appointment.startsAt)}</span><small>{appointment.code}</small></section>{outsideWindow ? <div className="link-window-warning"><AlertCircle size={20} /><div><strong>O prazo para esta ação on-line terminou.</strong><p>Seu horário não foi alterado. Fale diretamente com o studio para receber ajuda.</p></div></div> : <AppointmentLinkActionForm purpose={token.purpose} token={rawToken} />}{whatsapp ? <a className="text-link" href={whatsapp} rel="noreferrer" target="_blank">Preciso falar com o studio <MessageCircle size={16} /></a> : null}</main>;
}
