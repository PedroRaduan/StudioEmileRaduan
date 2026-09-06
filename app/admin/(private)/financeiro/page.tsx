import { ArrowDownLeft, ArrowUpRight, ReceiptText, Wallet } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getFinancialOverview } from "@/lib/admin/finance";
import { getPrisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/date-time";
import { FinanceActions } from "./finance-actions";
import Link from "next/link";
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);
export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const user = await requirePermission("FINANCE_VIEW");
  const mayManage = can(user.role, "FINANCE_MANAGE");
  const mayClose = can(user.role, "FINANCE_CLOSE");
  const [overview, clients, services] = await Promise.all([
    getFinancialOverview(),
    mayManage ? getPrisma().client.findMany({ where: { deletedAt: null }, select: { id: true, fullName: true, preferredName: true }, orderBy: { fullName: "asc" }, take: 250 }) : [],
    mayManage ? getPrisma().service.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }) : [],
  ]);
  return <main className="admin-page finance-page">
    <header className="admin-page-heading"><div><p className="eyebrow">Seu negócio em números</p><h1>Financeiro</h1><p>Entradas e saídas, sem complicação.</p></div><span className="finance-date">{formatDate(new Date(), { day: "numeric", month: "long", timeZone: overview.timezone })}</span></header>
    <section className="finance-overview" aria-label="Resumo financeiro de hoje">
      <article className="finance-balance"><span><Wallet size={18} /> Saldo do dia</span><strong>{money(overview.todayRevenue - overview.todayExpenses)}</strong><small>Recebimentos menos despesas registradas hoje</small></article>
      <article><span><ArrowDownLeft size={18} /> Recebido hoje</span><strong>{money(overview.todayRevenue)}</strong><small>Pagamentos confirmados</small></article>
      <article><span><ArrowUpRight size={18} /> Despesas hoje</span><strong>{money(overview.todayExpenses)}</strong><small>Saídas registradas</small></article>
    </section>
    <FinanceActions clients={clients} services={services} today={overview.today} mayManage={mayManage} mayClose={mayClose} />
    <Link className="secondary-action" href="/admin/estoque">Estoque · compras e materiais</Link>
    <section className="admin-card finance-transactions">
      <div className="card-heading"><div><p className="eyebrow">Movimentação</p><h2>Últimas despesas</h2></div><ReceiptText size={21} aria-hidden="true" /></div>
      {overview.expenses.length ? <ul className="finance-transactions-list">{overview.expenses.map((expense) => <li key={expense.id}><span className="expense-icon"><ArrowUpRight size={18} /></span><div><strong>{expense.description}</strong><small>{expense.category} · {formatDate(expense.occurredAt, { day: "2-digit", month: "short", timeZone: overview.timezone })}</small></div><b>− {money(expense.amountCents)}</b></li>)}</ul> : <div className="empty-state"><ReceiptText size={28} aria-hidden="true" /><p>Tudo em ordem por aqui.</p><span>Use “Nova despesa” para registrar sua primeira saída.</span></div>}
    </section>
    <div className="finance-commission"><span>Comissões pendentes</span><strong>{money(overview.pendingCommissionCents)}</strong></div>
  </main>;
}
