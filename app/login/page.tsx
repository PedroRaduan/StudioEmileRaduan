import Link from "next/link";
import { LoginForm } from "@/app/admin/login/login-form";
export const dynamic = "force-dynamic";
export const metadata = { title: "Entrar" };
export default function LoginPage() { return <main className="saas-auth"><section><Link className="saas-logo" href="/">agenda<span>.</span></Link><p className="eyebrow">ACESSO AO PAINEL</p><h1>Bem-vinda de volta.</h1><p>Entre para cuidar da agenda do seu negócio.</p><LoginForm /><p className="auth-footer"><Link href="/esqueci-minha-senha">Esqueci minha senha</Link><br />Ainda não tem uma conta? <Link href="/cadastro">Criar conta grátis</Link></p></section></main>; }
