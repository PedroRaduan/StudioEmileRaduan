import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { ServiceForm } from "../service-form";

export default async function NewServicePage() {
  await requirePermission("SERVICES_MANAGE");
  return <main className="admin-page editor-page"><Link className="back-link" href="/admin/servicos"><ArrowLeft size={17} /> Voltar para serviços</Link><div className="editor-heading"><p className="eyebrow">Novo serviço</p><h1>Defina seu atendimento.</h1><p>Valores, duração, sinal e orientações poderão ser alterados pelo painel.</p></div><section className="editor-card"><ServiceForm /></section></main>;
}
