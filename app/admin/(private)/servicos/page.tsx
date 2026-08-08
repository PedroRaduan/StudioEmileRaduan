import Link from "next/link";
import { ClipboardPlus, Edit3, Eye, EyeOff } from "lucide-react";
import { listServices } from "@/lib/admin/services";
import { requirePermission } from "@/lib/auth/session";

export default async function ServicesPage() {
  await requirePermission("SERVICES_MANAGE");
  const services = await listServices();
  return <main className="admin-page"><div className="admin-page-heading"><div><p className="eyebrow">Serviços</p><h1>Seu menu, do seu jeito.</h1><p>Duração, intervalos, valores, sinal e orientações são configurados por você.</p></div><Link className="button button-primary" href="/admin/servicos/novo"><ClipboardPlus size={18} /> Novo serviço</Link></div><section className="admin-card services-admin-list">{services.length ? services.map((service) => <article key={service.id}><i style={{ backgroundColor: service.calendarColor }} /><div><strong>{service.name}</strong><span>{service.durationMinutes} min · {service.preparationMinutes ? `${service.preparationMinutes} min de preparo · ` : ""}{service.cleanupMinutes ? `${service.cleanupMinutes} min de intervalo` : "sem intervalo"}{!service.isActive ? " · inativo" : ""}</span></div><div className="service-admin-meta">{service.priceCents !== null ? <b>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((service.promotionalPriceCents ?? service.priceCents) / 100)}</b> : <b>Valor não informado</b>}<small>{service.isOnlineAvailable ? <><Eye size={14} /> Visível no site</> : <><EyeOff size={14} /> Interno</>}</small></div><Link aria-label={`Editar ${service.name}`} className="icon-action" href={`/admin/servicos/${service.id}/editar`}><Edit3 size={16} /></Link></article>) : <div className="empty-state"><p>Nenhum serviço cadastrado.</p><span>Crie os serviços oferecidos e defina as regras de cada atendimento.</span><Link href="/admin/servicos/novo">Criar serviço</Link></div>}</section></main>;
}
