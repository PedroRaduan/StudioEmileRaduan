import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Database, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminSetupState, isInitialSetupAllowed } from "@/lib/auth/initial-setup";
import { InitialSetupForm } from "./initial-setup-form";

export const metadata: Metadata = { title: "Configuração inicial", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function InitialAdminSetupPage({ searchParams }: { searchParams: Promise<{ removed?: string }> }) {
  const [state, current, requestHeaders, params] = await Promise.all([getAdminSetupState(), getCurrentUser(), headers(), searchParams]);
  if (current) redirect("/admin");
  if (state === "ready") redirect("/admin/login");
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const allowed = isInitialSetupAllowed(host);

  return <main className="initial-setup-page"><section className="initial-setup-panel"><Link className="wordmark" href="/">Emile Raduan<small>Beauty Face</small></Link>{params.removed === "1" ? <p className="form-success" role="status">O acesso temporário foi removido. Os dados da agenda foram preservados.</p> : null}{state === "unavailable" ? <ConfigurationUnavailable /> : !allowed ? <SetupClosed /> : <><div className="initial-setup-heading"><p className="eyebrow"><ShieldCheck size={15} /> Primeiro acesso</p><h1>Crie seu acesso temporário.</h1><p>Você escolhe a senha diretamente aqui. Ela será protegida e nunca será exibida ou enviada para nós.</p></div><div className="temporary-access-note"><strong>Para visualizar e testar a administração</strong><span>A agenda começa vazia. Depois, em Configurações, você poderá tornar a conta definitiva ou removê-la mantendo os dados cadastrados.</span></div><InitialSetupForm /><section className="setup-legal"><details id="termos-administracao"><summary>Termos de administração</summary><p>Este acesso permite gerenciar dados do studio e de clientes. A pessoa responsável deve manter a senha em sigilo, conceder acessos somente a pessoas autorizadas e revisar as configurações antes do uso com dados reais.</p></details><details id="aviso-privacidade"><summary>Aviso de privacidade</summary><p>Nome, e-mail, registros de acesso e informações técnicas de segurança são utilizados para autenticação, auditoria e proteção do sistema. Senhas são armazenadas somente como hash seguro.</p></details></section></>}</section><aside className="initial-setup-aside" aria-hidden="true"><div /><span>ER</span></aside></main>;
}

function ConfigurationUnavailable() { return <div className="setup-state"><Database size={35} /><p className="eyebrow">Configuração necessária</p><h1>A agenda ainda não está conectada ao banco.</h1><p>Assim que a conexão segura e o segredo de sessão forem configurados, esta tela permitirá criar o primeiro acesso sem compartilhar senha.</p></div>; }
function SetupClosed() { return <div className="setup-state"><ShieldCheck size={35} /><p className="eyebrow">Configuração protegida</p><h1>A criação inicial está fechada.</h1><p>Neste ambiente, habilite temporariamente a configuração inicial e desative-a após criar a conta.</p><Link className="secondary-action" href="/admin/login">Voltar para entrar</Link></div>; }
