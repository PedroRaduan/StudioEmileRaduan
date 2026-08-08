import Link from "next/link";
import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { getCurrentClient, safeReturnTo } from "@/lib/client-auth/session";
import { ClientLoginForm } from "./login-form";

export default async function ClientLoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.returnTo);
  if (await getCurrentClient()) redirect(returnTo);
  return <main className="client-auth-page"><section className="client-auth-panel"><Link className="wordmark" href="/">Emile Raduan<small>Beauty Face</small></Link><div className="client-auth-heading"><p className="eyebrow"><LockKeyhole size={14} /> Área da cliente</p><h1>Bom ter você por aqui.</h1><p>Entre para concluir seu agendamento e acompanhar seus horários.</p></div><ClientLoginForm returnTo={returnTo} /></section><aside className="client-auth-aside" aria-hidden="true"><span>ER</span></aside></main>;
}
