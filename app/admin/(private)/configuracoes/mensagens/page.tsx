import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";
import { TemplateForm, TemplateStatusForm } from "./template-form";

export default async function MessagesSettingsPage() {
  await requirePermission("SETTINGS_MANAGE");
  const templates = await getPrisma().messageTemplate.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] });
  return <main className="admin-page editor-page"><Link className="back-link" href="/admin/configuracoes"><ArrowLeft size={17} /> Voltar para configurações</Link><div className="editor-heading"><p className="eyebrow">Mensagens</p><h1>Comunique com consistência.</h1><p>Enquanto não houver provedor oficial configurado, o sistema prepara o texto e a equipe confirma o envio manualmente.</p></div><section className="admin-card template-list"><p className="eyebrow">Modelos cadastrados</p>{templates.length ? templates.map((template) => <article key={template.id}><MessageCircle size={18} /><div><strong>{template.name}</strong><span>{channelLabel(template.channel)} · {template.body}</span></div><span className={`document-status ${template.isActive ? "active" : ""}`}>{template.isActive ? "Ativo" : "Inativo"}</span><TemplateStatusForm active={template.isActive} id={template.id} /></article>) : <div className="empty-state"><p>Nenhum modelo cadastrado.</p><span>Crie textos próprios do studio; o sistema não inventa mensagens institucionais.</span></div>}</section><section className="editor-card"><p className="eyebrow">Novo modelo</p><TemplateForm /></section></main>;
}
function channelLabel(channel: string) { return ({ WHATSAPP: "WhatsApp", EMAIL: "E-mail", PUSH: "Aplicativo" } as Record<string, string>)[channel] ?? channel; }
