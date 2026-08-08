import Link from "next/link";
import { ChevronLeft, Clock3 } from "lucide-react";
import { notFound } from "next/navigation";
import { addDays } from "date-fns";
import { getAvailableSlots } from "@/lib/client-booking/availability";
import { todayInTimezone } from "@/lib/date-time";
import { getPrisma } from "@/lib/db/prisma";
import { BookingHeader } from "../booking-header";
import { SlotPicker } from "./slot-picker";

export default async function BookingSlotsPage({ params, searchParams }: { params: Promise<{ serviceId: string }>; searchParams: Promise<{ date?: string }> }) {
  const [{ serviceId }, query] = await Promise.all([params, searchParams]);
  const [service, settings] = await Promise.all([getPrisma().service.findFirst({ where: { id: serviceId, isActive: true, isOnlineAvailable: true } }), getPrisma().studioSettings.findUnique({ where: { id: "studio" } })]);
  if (!service || !settings?.onlineBookingEnabled) notFound();
  const today = todayInTimezone(settings.timezone);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(query.date ?? "") ? query.date! : today;
  const base = new Date(`${today}T12:00:00`);
  const dates = Array.from({ length: 7 }, (_, index) => addDays(base, index));
  const slots = await getAvailableSlots(service.id, date);
  return <main className="booking-page"><BookingHeader step={2} /><section className="booking-content"><Link className="back-link" href="/agendar"><ChevronLeft size={16} />Trocar serviço</Link><div className="booking-service-summary"><i style={{ background: service.calendarColor }} /><div><p className="eyebrow">Serviço escolhido</p><h1>{service.name}</h1><span><Clock3 size={15} /> {service.durationMinutes} min · {formatCurrency(service.promotionalPriceCents ?? service.priceCents)}</span></div></div><div className="date-picker"><p>Escolha uma data</p><div>{dates.map((item) => { const key = item.toISOString().slice(0, 10); return <Link className={key === date ? "selected" : ""} href={`/agendar/${service.id}?date=${key}`} key={key}><span>{new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(item).replace(".", "")}</span><strong>{new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(item)}</strong><small>{new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(item).replace(".", "")}</small></Link>; })}</div><form className="date-jump"><label htmlFor="date">Outra data</label><input defaultValue={date} id="date" max={addDays(base, settings.maxAdvanceDays).toISOString().slice(0, 10)} min={today} name="date" type="date" /><button className="secondary-action" type="submit">Ver data</button></form></div><SlotPicker date={date} serviceId={service.id} slots={slots.map(({ time }) => ({ time }))} /><p className="booking-security-note">Ao continuar, o horário fica reservado por alguns minutos enquanto você confere os dados.</p></section></main>;
}

function formatCurrency(value: number | null) { return value === null ? "Valor sob consulta" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100); }
