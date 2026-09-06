import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getPrisma } from "@/lib/db/prisma";
import { StockItemForm, StockMovementForm } from "./forms";

export default async function StockPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requirePermission("FINANCE_VIEW");
  const { q = "" } = await searchParams;
  const items = await getPrisma().inventoryItem.findMany({ where: { name: { contains: q.slice(0, 100), mode: "insensitive" } }, orderBy: { name: "asc" }, take: 100 });
  const manage = can(user.role, "FINANCE_MANAGE");
  return <main className="admin-page editor-page"><Link className="back-link" href="/admin/financeiro">← Financeiro</Link><header className="editor-heading"><p className="eyebrow">Materiais do negócio</p><h1>Estoque</h1><p>Compras entram nas despesas. Uso reduz apenas a quantidade disponível.</p></header>
    <form className="editor-form" role="search"><label>Pesquisar produto<input type="search" name="q" defaultValue={q} maxLength={100} /></label><button className="secondary-action">Pesquisar</button></form>
    <section className="admin-card"><h2>Produtos</h2>{items.length ? <ul className="stock-list">{items.map((item) => <li key={item.id}><strong>{item.name}</strong><span>{item.quantity} un.</span>{item.quantity <= item.minimum ? <small>Estoque baixo</small> : null}</li>)}</ul> : <p>Nenhum produto encontrado. Cadastre o primeiro abaixo.</p>}{items.length === 100 ? <p>Exibindo até 100 produtos. Refine a pesquisa para encontrar outros.</p> : null}</section>
    {manage ? <><details className="progressive-fields"><summary>Cadastrar produto</summary><StockItemForm /></details>{items.length ? <details className="progressive-fields"><summary>Registrar compra ou uso</summary><StockMovementForm items={items} /></details> : null}</> : null}
  </main>;
}
