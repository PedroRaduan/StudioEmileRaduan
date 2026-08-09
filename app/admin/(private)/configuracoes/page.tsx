import Link from "next/link";
import { CalendarClock, CalendarOff, CalendarRange, ChevronRight, FileText, KeyRound, MessageCircle, Users } from "lucide-react";
import { getStudioSettings } from "@/lib/admin/settings";
import { SettingsForm } from "./settings-form";

const areas = [
  { href: "/admin/configuracoes/acesso", icon: KeyRound, title: "Acesso administrativo", description: "Gerencie o acesso temporário ou torne a conta definitiva." },
  { href: "/admin/configuracoes/horarios", icon: CalendarClock, title: "Horários semanais", description: "Defina expediente e intervalos recorrentes." },
  { href: "/admin/configuracoes/agenda", icon: CalendarRange, title: "Visual da agenda", description: "Escolha o intervalo de referência da grade diária." },
  { href: "/admin/configuracoes/bloqueios", icon: CalendarOff, title: "Bloqueios e exceções", description: "Folgas, datas fechadas e horários especiais." },
  { href: "/admin/configuracoes/mensagens", icon: MessageCircle, title: "Modelos de mensagens", description: "Textos usados na preparação manual de lembretes." },
  { href: "/admin/configuracoes/termos", icon: FileText, title: "Termos e consentimentos", description: "Documentos versionados e aceites rastreáveis." },
  { href: "/admin/configuracoes/equipe", icon: Users, title: "Equipe e permissões", description: "Crie acessos restritos para recepcionistas." },
];

export default async function SettingsPage() {
  const settings = await getStudioSettings();
  return <main className="admin-page settings-page"><div className="editor-heading"><p className="eyebrow">Configurações</p><h1>O studio é seu.</h1><p>Atualize regras, equipe e informações públicas sem alterar o código.</p></div><nav className="settings-link-grid" aria-label="Áreas de configuração">{areas.map(({ href, icon: Icon, title, description }) => <Link className="settings-link-card" href={href} key={href}><Icon size={21} /><span><strong>{title}</strong><small>{description}</small></span><ChevronRight size={18} /></Link>)}</nav><section className="editor-card settings-main-card"><p className="eyebrow">Identidade e contato</p><SettingsForm settings={settings} /></section></main>;
}
