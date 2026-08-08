import Link from "next/link";
import { ShieldX } from "lucide-react";

export default function AccessDeniedPage() {
  return <main className="admin-page state-page"><ShieldX size={34} /><p className="eyebrow">Acesso restrito</p><h1>Esta área exige outra permissão.</h1><p>Você pode continuar usando a agenda, os cadastros e as ações liberadas para o seu perfil.</p><Link className="button button-primary" href="/admin">Voltar à visão geral</Link></main>;
}
