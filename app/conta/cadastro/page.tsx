import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentClient, safeReturnTo } from "@/lib/client-auth/session";
import { ClientSignupForm } from "./signup-form";

export default async function ClientSignupPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.returnTo);
  if (await getCurrentClient()) redirect(returnTo);
  return <main className="client-auth-page signup-page"><section className="client-auth-panel"><Link className="wordmark" href="/">Emile Raduan<small>Beauty Face</small></Link><div className="client-auth-heading"><p className="eyebrow">Seu acesso</p><h1>Crie sua conta.</h1><p>Seus dados ficam salvos para agilizar os próximos agendamentos.</p></div><ClientSignupForm returnTo={returnTo} /></section><aside className="client-auth-aside" aria-hidden="true"><span>ER</span></aside></main>;
}
