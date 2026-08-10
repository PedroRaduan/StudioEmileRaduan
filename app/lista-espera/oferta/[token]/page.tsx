import Link from "next/link";
import { OfferForm } from "./offer-form";
export default async function WaitlistOfferPage({ params }: { params: Promise<{ token: string }> }) { const { token } = await params; return <main className="saas-auth"><section><Link className="saas-logo" href="/">agenda<span>.</span></Link><p className="eyebrow">UMA VAGA FICOU DISPONÍVEL</p><h1>Seu horário pode estar aqui.</h1><p>Esta oferta é individual, protegida por um link temporário e expira caso não seja confirmada.</p><OfferForm token={token} /></section></main>; }
