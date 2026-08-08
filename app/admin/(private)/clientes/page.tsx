import Link from "next/link";
import { Search, UserPlus } from "lucide-react";
import { listClients } from "@/lib/admin/clients";
import { formatDate } from "@/lib/date-time";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const clients = await listClients(params.q);
  return <main className="admin-page clients-page"><div className="admin-page-heading"><div><p className="eyebrow">Clientes</p><h1>Cadastro organizado.</h1><p>Dados e histórico em um só lugar.</p></div><Link className="button button-primary" href="/admin/clientes/novo"><UserPlus size={18} /> Nova cliente</Link></div><form className="client-search"><label htmlFor="q">Buscar clientes</label><Search size={18} aria-hidden="true" /><input defaultValue={params.q ?? ""} id="q" name="q" placeholder="Nome, telefone ou e-mail" /><button type="submit">Buscar</button></form><section className="admin-card client-table-card">{clients.length ? <div className="client-table" role="table"><div className="client-table-head" role="row"><span>Cliente</span><span>Contato</span><span>Último atendimento</span><span>Histórico</span></div>{clients.map((client) => <Link href={`/admin/clientes/${client.id}`} key={client.id} role="row"><span><strong>{client.preferredName ?? client.fullName}</strong><em>{statusLabel(client.status)}</em></span><span>{client.whatsapp ?? client.phone ?? client.email ?? "Não informado"}</span><span>{client.lastAppointmentAt ? formatDate(client.lastAppointmentAt, { day: "2-digit", month: "short", year: "numeric" }) : "Sem atendimento"}</span><span>{client._count.appointments} atendimento{client._count.appointments === 1 ? "" : "s"}</span></Link>)}</div> : <div className="empty-state"><p>Nenhuma cliente encontrada.</p><span>{params.q ? "Tente buscar com outro dado." : "Cadastre a primeira cliente para começar a organizar os atendimentos."}</span>{!params.q ? <Link href="/admin/clientes/novo">Cadastrar cliente</Link> : null}</div>}</section></main>;
}

function statusLabel(status: string) { return ({ NEW: "Nova", ACTIVE: "Ativa", RECURRING: "Recorrente", INACTIVE: "Inativa", BLOCKED: "Bloqueada", FOLLOW_UP_DUE: "Retorno pendente", PAYMENT_DUE: "Pagamento pendente" } as Record<string, string>)[status] ?? status; }
