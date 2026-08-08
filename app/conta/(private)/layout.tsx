import Link from "next/link";
import { CalendarPlus, LogOut, UserRound } from "lucide-react";
import { requireClient } from "@/lib/client-auth/session";
import { clientLogoutAction } from "../actions";

export default async function ClientPrivateLayout({ children }: { children: React.ReactNode }) {
  const client = await requireClient();
  return <div className="client-shell"><header className="client-header"><Link className="wordmark" href="/">Emile Raduan<small>Beauty Face</small></Link><nav aria-label="Área da cliente"><Link href="/conta"><UserRound size={17} />Meus horários</Link><Link className="button button-primary client-book-button" href="/agendar"><CalendarPlus size={17} />Agendar</Link><form action={clientLogoutAction}><button aria-label="Sair da conta" className="client-logout" type="submit"><LogOut size={18} /><span>Sair</span></button></form></nav></header><main className="client-main"><p className="client-welcome">Olá, {client.preferredName ?? client.fullName.split(" ")[0]}.</p>{children}</main></div>;
}
