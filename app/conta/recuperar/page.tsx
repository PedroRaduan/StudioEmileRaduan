import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { RecoveryForm } from "./recovery-form";

export default function RecoveryPage() {
  return <main className="client-auth-page"><section className="client-auth-panel"><Link className="wordmark" href="/">Emile Raduan<small>Beauty Face</small></Link><div className="client-auth-heading"><p className="eyebrow">Recuperação de acesso</p><h1>Vamos ajudar.</h1><p>Como o envio automático ainda não está configurado, sua solicitação será encaminhada ao studio para contato manual.</p></div><RecoveryForm /><Link className="back-link auth-back" href="/conta/entrar"><ChevronLeft size={16} />Voltar para entrar</Link></section><aside className="client-auth-aside" aria-hidden="true"><span>ER</span></aside></main>;
}
