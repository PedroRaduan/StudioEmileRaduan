import Link from "next/link";
import { CalendarClock, CalendarOff, CalendarRange, ChevronRight, Download, FileText, KeyRound, MessageCircle, Users } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";

const areas = [
  { href: "/admin/configuracoes/acesso", icon: KeyRound, title: "Acesso administrativo", description: "Cuide da segurança da sua conta." },
  { href: "/admin/configuracoes/horarios", icon: CalendarClock, title: "Horários semanais", description: "Defina expediente e intervalos recorrentes." },
  { href: "/admin/configuracoes/agenda", icon: CalendarRange, title: "Visual da agenda", description: "Escolha o intervalo de referência da grade diária." },
  { href: "/admin/configuracoes/bloqueios", icon: CalendarOff, title: "Bloqueios e exceções", description: "Folgas, datas fechadas e horários especiais." },
  { href: "/admin/configuracoes/mensagens", icon: MessageCircle, title: "Modelos de mensagens", description: "Textos usados na preparação manual de lembretes." },
  { href: "/admin/configuracoes/termos", icon: FileText, title: "Termos e consentimentos", description: "Organize os documentos usados nos atendimentos." },
  { href: "/admin/configuracoes/equipe", icon: Users, title: "Equipe e permissões", description: "Crie acessos restritos para recepcionistas." },
  { href: "/admin/configuracoes/instalar-app", icon: Download, title: "Instalar aplicativo", description: "Use a agenda como app no celular ou computador." },
];

export default async function SettingsPage() {
  await requirePermission("SETTINGS_MANAGE");
  return <main className="admin-page settings-page"><div className="editor-heading"><p className="eyebrow">Configurações</p><h1>Do seu jeito.</h1><p>Ajuste os horários, cuide dos acessos e instale a agenda.</p></div><nav className="settings-link-grid" aria-label="Áreas de configuração">{areas.map(({ href, icon: Icon, title, description }) => <Link className="settings-link-card" href={href} key={href}><Icon size={21} /><span><strong>{title}</strong><small>{description}</small></span><ChevronRight size={18} /></Link>)}</nav></main>;
}
