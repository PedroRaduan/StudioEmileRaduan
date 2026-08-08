import Link from "next/link";
import { ChevronRight, Clock3, MessageCircle } from "lucide-react";
import { getPrisma } from "@/lib/db/prisma";
import { whatsappLink } from "@/lib/studio";
import { BookingHeader } from "./booking-header";

export const dynamic = "force-dynamic";

export default async function BookingServicesPage() {
  if (!process.env.DATABASE_URL) return <BookingUnavailable />;
  const [settings, services] = await Promise.all([
    getPrisma().studioSettings.findUnique({ where: { id: "studio" } }),
    getPrisma().service.findMany({ where: { isActive: true, isOnlineAvailable: true }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] }),
  ]);
  if (!settings?.onlineBookingEnabled) return <BookingUnavailable whatsapp={settings?.whatsapp} />;
  return <main className="booking-page"><BookingHeader step={1} /><section className="booking-content"><div className="booking-heading"><p className="eyebrow">Escolha o cuidado</p><h1>Qual serviço deseja agendar?</h1><p>Na próxima etapa, você verá somente os horários realmente disponíveis.</p></div>{services.length ? <div className="booking-service-list">{services.map((service) => <Link href={`/agendar/${service.id}`} key={service.id}><i style={{ background: service.calendarColor }} /><div><h2>{service.name}</h2>{service.shortDescription ? <p>{service.shortDescription}</p> : null}<span><Clock3 size={15} /> {service.durationMinutes} min</span></div><div className="booking-service-price">{formatCurrency(service.promotionalPriceCents ?? service.priceCents)}<ChevronRight size={19} /></div></Link>)}</div> : <div className="client-empty"><h3>Nenhum serviço disponível on-line.</h3><p>Entre em contato com o studio para consultar opções.</p></div>}</section></main>;
}

function BookingUnavailable({ whatsapp }: { whatsapp?: string | null }) {
  const link = whatsapp ? whatsappLink(whatsapp, "Olá! Gostaria de consultar um horário.") : null;
  return <main className="booking-page"><BookingHeader step={1} /><section className="booking-content"><div className="client-empty booking-empty"><MessageCircle size={30} /><h1>Agendamento on-line indisponível.</h1><p>Os horários continuam sendo organizados diretamente pelo studio.</p>{link ? <a className="button button-primary" href={link} rel="noreferrer" target="_blank">Falar no WhatsApp</a> : <Link className="secondary-action" href="/">Voltar ao site</Link>}</div></section></main>;
}

function formatCurrency(value: number | null) { return value === null ? "Valor sob consulta" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100); }
