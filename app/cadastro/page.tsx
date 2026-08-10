import { SignupForm } from "./signup-form";

export const metadata = { title: "Criar conta" };

export default function SignupPage() {
  return <main className="saas-auth"><section><Link className="saas-logo" href="/">agenda<span>.</span></Link><p className="eyebrow">COMECE SEM CARTÃO</p><h1>Crie sua conta e organize seu negócio.</h1><p>Depois você configura o estabelecimento em poucos passos.</p><SignupForm /></section></main>;
}
import Link from "next/link";
