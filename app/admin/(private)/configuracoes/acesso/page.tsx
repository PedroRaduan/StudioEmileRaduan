import Link from "next/link";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { requireOwner } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";
import { FinalizeAccessForm, PermanentAccessNotice } from "./access-forms";

export default async function AdminAccessSettingsPage() {
  const owner = await requireOwner();
  const user = await getPrisma().user.findUniqueOrThrow({ where: { id: owner.id } });

  return (
    <main className="admin-page editor-page">
      <Link className="back-link" href="/admin/configuracoes"><ChevronLeft aria-hidden="true" size={17} />Voltar para configurações</Link>
      <div className="editor-heading"><p className="eyebrow">Acesso administrativo</p><h1>Seu acesso está protegido.</h1><p>A conta principal usa senha protegida e sessões armazenadas no banco.</p></div>
      {user.isTemporary ? (
        <section className="editor-card">
          <div className="section-inline-heading"><div><p className="eyebrow">Atualização necessária</p><h2>Concluir proteção da conta antiga</h2></div><ShieldCheck aria-hidden="true" size={23} /></div>
          <p className="muted-copy access-legacy-note">Este acesso foi criado por uma versão anterior. Confirme os dados para mantê-lo como conta principal permanente.</p>
          <FinalizeAccessForm email={user.email} name={user.name} />
        </section>
      ) : <section className="editor-card"><PermanentAccessNotice /></section>}
    </main>
  );
}
