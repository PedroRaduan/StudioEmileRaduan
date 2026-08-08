import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";
import { ServiceForm } from "../../service-form";

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("SERVICES_MANAGE");
  const { id } = await params;
  const service = await getPrisma().service.findUnique({ where: { id } });
  if (!service) notFound();
  return <main className="admin-page editor-page"><Link className="back-link" href="/admin/servicos"><ArrowLeft size={17} /> Voltar para serviços</Link><div className="editor-heading"><p className="eyebrow">Editar serviço</p><h1>{service.name}</h1><p>Alterações afetam novos agendamentos; o histórico mantém os valores já registrados.</p></div><section className="editor-card"><ServiceForm service={service} /></section></main>;
}
