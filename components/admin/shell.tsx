"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, CalendarPlus, ChartNoAxesCombined, ClipboardList, LogOut, Menu, Settings, Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/app/admin/(private)/actions";
import { can, type Permission, type StaffRole } from "@/lib/auth/permissions";
import { STUDIO_BRAND } from "@/lib/studio-config";

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

export function AdminShell({ children, staffName, staffRole }: { children: React.ReactNode; staffName: string; staffRole: StaffRole }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mobileNavigation, setMobileNavigation] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const visibleLinks = links.filter((link) => !link.permission || can(staffRole, link.permission));

  useEffect(() => {
    const query = window.matchMedia("(max-width: 900px)");
    const update = () => setMobileNavigation(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!open || !mobileNavigation) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebarRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key === "Tab") {
        const focusable = sidebarRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", closeWithEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeWithEscape); };
  }, [mobileNavigation, open]);

  return (
    <div className="admin-shell">
      <aside ref={sidebarRef} className={`admin-sidebar ${open ? "is-open" : ""}`} aria-hidden={mobileNavigation && !open ? true : undefined} aria-label="Navegação administrativa" id="admin-primary-navigation" inert={mobileNavigation && !open ? true : undefined}>
        <div className="admin-brand"><span>{STUDIO_BRAND.wordmarkPrimary}</span><small>{STUDIO_BRAND.wordmarkSecondary}</small></div>
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
          <button ref={menuButtonRef} aria-controls="admin-primary-navigation" aria-expanded={open} aria-label={open ? "Fechar menu" : "Abrir menu"} onClick={() => setOpen((value) => !value)} type="button">{open ? <X aria-hidden="true" size={21} /> : <Menu aria-hidden="true" size={21} />}</button>
          <span>{STUDIO_BRAND.wordmarkPrimary}</span>
          <Link aria-label="Criar agendamento" href="/admin/agendamentos/novo"><CalendarPlus aria-hidden="true" size={21} /></Link>
        </header>
        {children}
        <nav aria-label="Atalhos administrativos" className="admin-bottom-nav">
          <Link className={pathname === "/admin" ? "active" : ""} href="/admin"><ChartNoAxesCombined aria-hidden="true" size={19} /><span>Início</span></Link>
          <Link className={pathname.startsWith("/admin/agenda") ? "active" : ""} href="/admin/agenda"><CalendarDays aria-hidden="true" size={19} /><span>Agenda</span></Link>
          <Link className="primary" href="/admin/agendamentos/novo"><CalendarPlus aria-hidden="true" size={21} /><span>Novo</span></Link>
          <Link className={pathname.startsWith("/admin/clientes") ? "active" : ""} href="/admin/clientes"><Users aria-hidden="true" size={19} /><span>Clientes</span></Link>
          <button aria-expanded={open} onClick={() => setOpen(true)} type="button"><Menu aria-hidden="true" size={19} /><span>Mais</span></button>
        </nav>
      </section>
    </div>
  );
}
