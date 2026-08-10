import Link from "next/link";
import { OnboardingForm } from "./onboarding-form";
export const dynamic = "force-dynamic";
export default function OnboardingPage() { return <main className="saas-auth"><section><Link className="saas-logo" href="/">agenda<span>.</span></Link><p className="eyebrow">SEU ESPAÇO ESTÁ QUASE PRONTO</p><h1>Vamos configurar o essencial.</h1><p>Você poderá completar horários, equipe e identidade visual depois.</p><OnboardingForm /></section></main>; }
