import Link from "next/link";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { requireClient } from "@/lib/client-auth/session";
import { getPrisma } from "@/lib/db/prisma";
import { ClientProfileForm } from "./profile-form";

export default async function ClientProfilePage() {
  const current = await requireClient();
  const client = await getPrisma().client.findUniqueOrThrow({ where: { id: current.clientId }, select: { fullName: true, preferredName: true, whatsapp: true, contactPreference: true, email: true, consents: { where: { document: { type: "COMMUNICATION", isActive: true } }, orderBy: { grantedAt: "desc" }, take: 1, select: { granted: true } } } });
  return <><Link className="back-link" href="/conta"><ChevronLeft size={16} />Voltar aos horários</Link><div className="client-page-heading"><div><p className="eyebrow">Perfil</p><h1>Meus dados</h1><p>Mantenha seu contato atualizado para receber orientações do studio.</p></div></div><section className="client-section client-profile-card"><div className="sensitive-notice"><ShieldCheck size={18} />Seu e-mail de acesso é {client.email}. Para alterá-lo, fale com o studio.</div><ClientProfileForm client={{ ...client, communicationAccepted: client.consents[0]?.granted ?? false }} /></section></>;
}
