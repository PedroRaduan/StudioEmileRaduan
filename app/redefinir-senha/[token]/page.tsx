import Link from "next/link";
import { AccountResetForm } from "./reset-form";
export default async function ResetAccountPage({ params }: { params: Promise<{ token: string }> }) { const { token } = await params; return <main className="saas-auth"><section><Link className="saas-logo" href="/">agenda<span>.</span></Link><p className="eyebrow">NOVA SENHA</p><h1>Proteja seu acesso.</h1><AccountResetForm token={token} /></section></main>; }
