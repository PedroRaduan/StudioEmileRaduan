import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";
import { StaffForm, StaffStatusForm } from "./staff-form";

export default async function TeamSettingsPage() {
  await requirePermission("STAFF_MANAGE");
  const staff = await getPrisma().user.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }] });
  return <main className="admin-page editor-page"><Link className="back-link" href="/admin/configuracoes"><ArrowLeft size={17} /> Voltar para configurações</Link><div className="editor-heading"><p className="eyebrow">Equipe e permissões</p><h1>Acesso na medida certa.</h1><p>A recepcionista pode cuidar da agenda, clientes e pagamentos, sem acessar configurações sensíveis, relatórios financeiros ou exportações.</p></div><section className="admin-card staff-list"><p className="eyebrow">Acessos atuais</p>{staff.map((user) => <article key={user.id}><span className={`status-dot ${user.isActive ? "active" : ""}`} /><div><strong>{user.name}</strong><small>{user.email} · {user.role === "OWNER" ? "Administradora" : "Recepcionista"}</small></div><span className="staff-status">{user.isActive ? "Ativo" : "Desativado"}</span>{user.role === "RECEPTIONIST" ? <StaffStatusForm isActive={user.isActive} userId={user.id} /> : <ShieldCheck size={18} aria-label="Conta principal" />}</article>)}</section><section className="editor-card team-create-card"><p className="eyebrow">Novo acesso</p><StaffForm /></section></main>;
}
