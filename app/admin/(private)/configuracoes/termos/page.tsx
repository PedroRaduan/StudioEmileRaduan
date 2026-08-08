import Link from "next/link";
import { ArrowLeft, FileCheck2 } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/date-time";
import { DeactivateDocumentForm, DocumentForm } from "./document-form";

export default async function DocumentsPage() {
  await requirePermission("SETTINGS_MANAGE");
  const documents = await getPrisma().document.findMany({ include: { _count: { select: { consents: true } } }, orderBy: { createdAt: "desc" } });
  return <main className="admin-page editor-page">
    <Link className="back-link" href="/admin/configuracoes"><ArrowLeft size={17} /> Voltar para configurações</Link>
    <div className="editor-heading"><p className="eyebrow">Termos e consentimentos</p><h1>Versões preservadas, aceites rastreáveis.</h1><p>Cadastre apenas textos revisados pelo studio e, quando necessário, por assessoria jurídica.</p></div>
    <section className="admin-card document-list"><p className="eyebrow">Documentos cadastrados</p>{documents.length ? documents.map((document) => <article key={document.id}><FileCheck2 size={18} /><div><strong>{document.title}</strong><span>{typeLabel(document.type)} · versão {document.version} · {document._count.consents} aceite(s) · {formatDate(document.createdAt, { day: "2-digit", month: "short", year: "numeric" })}</span></div><span className={`document-status ${document.isActive ? "active" : ""}`}>{document.isActive ? "Ativo" : "Inativo"}</span>{document.isActive ? <DeactivateDocumentForm id={document.id} /> : null}</article>) : <div className="empty-state"><p>Nenhum documento cadastrado.</p><span>O sistema não cria textos jurídicos automaticamente. Publique o conteúdo aprovado pelo studio.</span></div>}</section>
    <section className="editor-card"><p className="eyebrow">Nova versão</p><DocumentForm /></section>
  </main>;
}

function typeLabel(type: string) { return ({ PRIVACY: "Privacidade", COMMUNICATION: "Comunicações", PHOTO: "Uso de fotos", PROCEDURE: "Procedimento" } as Record<string, string>)[type] ?? type; }
