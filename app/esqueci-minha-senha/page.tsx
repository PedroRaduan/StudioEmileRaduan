import Link from "next/link";
import { AccountRecoveryForm } from "./recovery-form";
export default function ForgotPasswordPage() { return <main className="saas-auth"><section><Link className="saas-logo" href="/">agenda<span>.</span></Link><p className="eyebrow">RECUPERAR ACESSO</p><h1>Defina uma nova senha.</h1><p>Enviaremos instruções se houver uma conta correspondente.</p><AccountRecoveryForm /></section></main>; }
