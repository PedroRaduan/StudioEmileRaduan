"use client";
import { useState } from "react";
import { CheckCheck, ChevronDown, Package, Plus, X } from "lucide-react";
import { CloseCashForm, ExpenseForm, PackageForm } from "./finance-forms";

type Props = {
  today: string; mayManage: boolean; mayClose: boolean;
  clients: { id: string; fullName: string; preferredName: string | null }[];
  services: { id: string; name: string }[];
};
type Panel = "expense" | "close" | "package";
const titles: Record<Panel, string> = { expense: "Nova despesa", close: "Fechar o dia", package: "Novo pacote" };

export function FinanceActions({ clients, services, today, mayManage, mayClose }: Props) {
  const [panel, setPanel] = useState<Panel | null>(null);
  function toggle(next: Panel) { setPanel(panel === next ? null : next); }
  return <section className="finance-tools" aria-label="Ações financeiras">
    <div className="finance-action-bar">
      {mayManage ? <button className="button button-primary" type="button" aria-expanded={panel === "expense"} aria-controls="finance-expense" onClick={() => toggle("expense")}><Plus size={18} /> Nova despesa</button> : null}
      {mayClose ? <button className="button button-outline" type="button" aria-expanded={panel === "close"} aria-controls="finance-close" onClick={() => toggle("close")}><CheckCheck size={18} /> Fechar o dia</button> : null}
      {mayManage ? <button className="button button-quiet" type="button" aria-expanded={panel === "package"} aria-controls="finance-package" onClick={() => toggle("package")}><Package size={18} /> Pacotes <ChevronDown size={15} /></button> : null}
    </div>
    {/* Keep each form mounted when switching panels so typed values are not discarded. */}
    {(["expense", "close", "package"] as const).filter((item) => item === "close" ? mayClose : mayManage).map((item) => <div className="admin-card finance-action-panel" hidden={panel !== item} id={`finance-${item}`} key={item}>
      <div className="card-heading"><h2>{titles[item]}</h2><button className="icon-button" type="button" aria-label="Recolher formulário" onClick={() => setPanel(null)}><X size={20} /></button></div>
      {item === "expense" ? <ExpenseForm today={today} /> : item === "close" ? <><p>Informe o total contado para conferir com os registros do dia.</p><CloseCashForm today={today} /></> : !clients.length || !services.length ? <div className="empty-state"><p>Cadastre um cliente e um serviço primeiro.</p><span>Depois você poderá reunir os atendimentos em um pacote.</span></div> : <PackageForm clients={clients} services={services} />}
    </div>)}
  </section>;
}
