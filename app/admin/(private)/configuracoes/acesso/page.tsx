import Link from "next/link";
import { ChevronLeft, Clock3 } from "lucide-react";
import { requireOwner } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";
import { FinalizeAccessForm, PermanentAccessNotice, RemoveTemporaryAccessForm } from "./access-forms";

export default async function AdminAccessSettingsPage() {
  const owner = await requireOwner();
  const user = await getPrisma().user.findUniqueOrThrow({ where: { id: owner.id } });
  return <main className="admin-page editor-page"><Link className="back-link" href="/admin/configuracoes"><ChevronLeft size={17} />Voltar para configurações</Link><div className="editor-heading"><p className="eyebrow">Acesso administrativo</p><h1>{user.isTemporary ? "Seu acesso é temporário." : "Seu acesso está protegido."}</h1><p>{user.isTemporary ? "Use a agenda para avaliar o sistema. Quando decidir, torne a conta definitiva ou remova este acesso sem apagar os dados da agenda." : "A conta principal está marcada como definitiva."}</p></div>{user.isTemporary ? <><section className="editor-card"><div className="section-inline-heading"><div><p className="eyebrow">Tornar definitivo</p><h2>Manter esta conta</h2></div><Clock3 size={23} /></div><FinalizeAccessForm email={user.email} name={user.name} /></section><section className="editor-card danger-card access-removal-card"><p className="eyebrow">Remover ou substituir</p><h2>Apagar somente este acesso</h2><p className="muted-copy">Clientes, serviços, horários e configurações permanecem no banco. Depois da remoção, a configuração inicial será aberta novamente para criar outra conta.</p><RemoveTemporaryAccessForm /></section></> : <section className="editor-card"><PermanentAccessNotice /></section>}</main>;
}
