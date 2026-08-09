import { redirect } from "next/navigation";
import { CalendarDays, Clock3, MapPin, ShieldCheck, WalletCards } from "lucide-react";
import { getCurrentClient } from "@/lib/client-auth/session";
import { getCurrentBookingHold } from "@/lib/client-booking/hold";
import { formatDate, formatTime } from "@/lib/date-time";
import { getPrisma } from "@/lib/db/prisma";
import { BookingHeader } from "../booking-header";
import { releaseBookingAction } from "../actions";
import { ConfirmBookingForm } from "./confirm-form";
import { HoldCountdown } from "./countdown";

export default async function BookingSummaryPage() {
  const hold = await getCurrentBookingHold();
  if (!hold) redirect("/agendar?expired=1");
  const current = await getCurrentClient();
  const [settings, policy] = await Promise.all([getPrisma().studioSettings.findUnique({ where: { id: "studio" } }), getPrisma().document.findFirst({ where: { isActive: true, type: "PROCEDURE" }, orderBy: { publishedAt: "desc" } })]);
  const price = hold.service.promotionalPriceCents ?? hold.service.priceCents;
  const deposit = hold.service.depositRequired && hold.service.depositValue && price !== null ? (hold.service.depositType === "PERCENT" ? Math.round(price * hold.service.depositValue / 100) : hold.service.depositValue) : null;
  const policyTitle = policy?.title ?? "a política de cancelamento do studio";
  const policyBody = policy?.body ?? hold.service.cancellationPolicy ?? settings?.cancellationPolicy ?? "Caso precise alterar seu horário, entre em contato com antecedência. As condições específicas serão confirmadas pelo studio.";
  return <main className="booking-page"><BookingHeader step={3} /><section className="booking-content summary-content"><div className="summary-title"><div><p className="eyebrow">Confira antes de confirmar</p><h1>Resumo do agendamento</h1></div><HoldCountdown expiresAt={hold.expiresAt.toISOString()} /></div><div className="booking-summary-grid"><section className="summary-card"><dl><div><dt><CalendarDays size={18} />Data</dt><dd>{formatDate(hold.startsAt, { weekday: "long", day: "2-digit", month: "long" })}</dd></div><div><dt><Clock3 size={18} />Horário</dt><dd>{formatTime(hold.startsAt)} · {hold.service.durationMinutes} min</dd></div><div><dt>Serviço</dt><dd>{hold.service.name}</dd></div><div><dt><WalletCards size={18} />Valor</dt><dd>{formatCurrency(price)}</dd></div>{deposit !== null ? <div><dt>Sinal previsto</dt><dd>{formatCurrency(deposit)} <small>aguardará confirmação manual do studio</small></dd></div> : null}<div><dt><MapPin size={18} />Local</dt><dd>{settings?.addressLine1 ? `${settings.addressLine1}${settings.city ? ` · ${settings.city}` : ""}` : "O studio informará o endereço antes do atendimento."}</dd></div></dl></section><aside className="policy-card"><ShieldCheck size={22} /><h2>{policyTitle}</h2><div>{policyBody}</div><p>Nenhum pagamento será marcado como aprovado sem confirmação real.</p></aside></div>{hold.service.beforeCare ? <section className="before-care"><h2>Antes do procedimento</h2><p>{hold.service.beforeCare}</p></section> : null}<ConfirmBookingForm policyTitle={policyTitle.toLowerCase()} signedIn={Boolean(current)} /><form action={releaseBookingAction}><button className="text-button" type="submit">Escolher outro horário</button></form></section></main>;
}
function formatCurrency(value: number | null) { return value === null ? "Valor sob consulta" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100); }
