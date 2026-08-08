"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, ChartNoAxesCombined, ChevronLeft, ClipboardList, Clock3, LogOut, Menu, Settings, Users, X } from "lucide-react";
import { useState } from "react";
import { logoutAction } from "@/app/admin/(private)/actions";
import { can, type Permission, type StaffRole } from "@/lib/auth/permissions";

type NavigationItem = {
  href: string;
  label: string;
  icon: typeof CalendarDays;
  exact?: boolean;
  permission?: Permission;
};

const links: NavigationItem[] = [
  { href: "/admin", label: "Visão geral", icon: ChartNoAxesCombined, exact: true },
  { href: "/admin/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/servicos", label: "Serviços", icon: ClipboardList, permission: "SERVICES_MANAGE" },
  { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3, permission: "REPORTS_VIEW" },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings, permission: "SETTINGS_MANAGE" },
];

export function AdminShell({ children, isTemporary, staffName, staffRole }: { children: React.ReactNode; isTemporary: boolean; staffName: string; staffRole: StaffRole }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const visibleLinks = links.filter((link) => !link.permission || can(staffRole, link.permission));

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${open ? "is-open" : ""}`} aria-label="Navegação administrativa">
        <div className="admin-brand"><span>Emile Raduan</span><small>Beauty Face</small></div>
        <nav className="admin-nav">
          {visibleLinks.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return <Link className={active ? "active" : ""} href={href} key={href} onClick={() => setOpen(false)}><Icon size={18} aria-hidden="true" />{label}</Link>;
          })}
        </nav>
        <div className="sidebar-footer">
          <span>{staffRole === "OWNER" ? "Administradora" : "Recepcionista"} · {staffName.split(" ")[0]}</span>
          <form action={logoutAction}><button type="submit"><LogOut size={16} aria-hidden="true" /> Sair</button></form>
        </div>
      </aside>
      {open ? <button className="nav-backdrop" aria-label="Fechar menu" onClick={() => setOpen(false)} type="button" /> : null}
      <section className="admin-content">
        <header className="admin-mobile-bar">
          <button aria-expanded={open} aria-label={open ? "Fechar menu" : "Abrir menu"} onClick={() => setOpen((value) => !value)} type="button">{open ? <X size={21} /> : <Menu size={21} />}</button>
          <span>Emile Raduan</span>
          <Link aria-label="Voltar para o site público" href="/"><ChevronLeft size={21} /></Link>
        </header>
        {isTemporary ? <aside className="temporary-admin-banner"><Clock3 size={16} /><span><strong>Acesso temporário.</strong> Use a agenda para testar com seus próprios dados e decida depois se deseja mantê-la.</span><Link href="/admin/configuracoes/acesso">Gerenciar acesso</Link></aside> : null}
        {children}
      </section>
    </div>
  );
}
