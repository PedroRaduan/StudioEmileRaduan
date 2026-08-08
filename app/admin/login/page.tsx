import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminSetupState } from "@/lib/auth/initial-setup";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Acesso administrativo", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const setupState = await getAdminSetupState();
  if (setupState === "needs_setup") redirect("/admin/configuracao-inicial");
  if (setupState === "ready" && await getCurrentUser()) redirect("/admin");
  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <Link className="wordmark login-wordmark" href="/" aria-label="Voltar à página pública">
          <span>Emile Raduan</span><small>Beauty Face</small>
        </Link>
        <div className="login-intro">
          <p className="eyebrow"><ShieldCheck size={15} aria-hidden="true" /> Acesso restrito</p>
          <h1 id="login-title">Sua agenda, sob seu controle.</h1>
          <p>Entre para gerenciar horários, clientes e atendimentos.</p>
        </div>
        {setupState === "unavailable" ? <p className="form-error" role="alert">O banco de dados ainda não está conectado. A configuração inicial ficará disponível assim que a conexão segura for informada.</p> : <LoginForm />}
      </section>
      <aside className="login-aside" aria-hidden="true">
        <div className="login-brow" />
        <span>ER</span>
      </aside>
    </main>
  );
}
