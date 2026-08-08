import Link from "next/link";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { getPrisma } from "@/lib/db/prisma";
import { sha256 } from "@/lib/security/hash";
import { ResetPasswordForm } from "./reset-form";

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const record = /^[A-Za-z0-9_-]{40,60}$/.test(token) ? await getPrisma().clientPasswordResetToken.findUnique({ where: { tokenHash: sha256(token) } }) : null;
  const valid = record && !record.usedAt && record.expiresAt > new Date();
  return <main className="client-auth-page"><section className="client-auth-panel"><Link className="wordmark" href="/">Emile Raduan<small>Beauty Face</small></Link>{valid ? <><div className="client-auth-heading"><p className="eyebrow"><ShieldCheck size={14} /> Link seguro</p><h1>Defina sua nova senha.</h1><p>Depois de salvar, você entrará automaticamente na sua conta.</p></div><ResetPasswordForm token={token} /></> : <div className="client-auth-heading"><p className="eyebrow"><AlertCircle size={14} /> Link indisponível</p><h1>Este link expirou.</h1><p>Solicite uma nova ajuda de acesso. Nenhuma informação da sua conta foi exposta.</p><Link className="button button-primary" href="/conta/recuperar">Solicitar novo acesso</Link></div>}</section><aside className="client-auth-aside" aria-hidden="true"><span>ER</span></aside></main>;
}
