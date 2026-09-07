"use client";
import { useEffect, useState } from "react";

const navigation = [
  { label: "Inteligencia editorial", links: [{ href: "/", label: "Resumen", icon: "⌂" }, { href: "/radar", label: "Radar de tendencias", icon: "⌁" }, { href: "/expedientes", label: "Expedientes", icon: "▤" }] },
  { label: "Flujo de producción", links: [{ href: "/ordenes", label: "Órdenes", icon: "＋" }, { href: "/videos", label: "Producción AI", icon: "◫" }, { href: "/aprobaciones", label: "Aprobaciones", icon: "✓" }] },
  { label: "Administración", links: [{ href: "/configuracion", label: "Configuración", icon: "⚙" }, { href: "/trazas", label: "Trazabilidad", icon: "⌘" }] },
];
export function AppFrame({ active, title, subtitle, user = "Usuario demo", role = "Cargando rol…", actions, children }: { active: string; title: string; subtitle?: string; user?: string; role?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  const [identity, setIdentity] = useState({ user, role, integrationMode: "Comprobando integración" });
  useEffect(() => { fetch("/api/auth/me").then((response) => response.ok ? response.json() : null).then((data) => { if (data?.user) setIdentity({ user: data.user.name, role: data.user.role, integrationMode: data.integrationMode ?? "Modo demostración" }); }).catch(() => {}); }, []);
  const userName = identity.user;
  const roleName = identity.role;
  return <main className="app-shell"><aside className="sidebar"><div className="brand"><span className="brand-mark">N</span><span><strong>Nexo</strong><small>Sala editorial IA</small></span></div><nav aria-label="Navegación principal">{navigation.map((group) => <section className="nav-section" key={group.label}><span className="nav-label">{group.label}</span>{group.links.map((link) => <a className={`nav-item ${active === link.href ? "active" : ""}`} href={link.href} title={link.label} key={link.href}><span>{link.icon}</span><b>{link.label}</b></a>)}</section>)}</nav><div className="sidebar-foot"><div className="demo-pill"><i />{identity.integrationMode}</div><div className="user-card"><span>{userName.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><div><strong>{userName}</strong><small>{roleName}</small></div><a href="/api/auth/logout">Salir</a></div></div></aside><section className="workspace"><header className="topbar"><div><p className="eyebrow">Sala editorial · America/Guatemala</p><h1>{title}</h1>{subtitle && <p className="page-subtitle">{subtitle}</p>}</div><div className="top-actions">{actions}</div></header><div className="content page-content">{children}</div></section></main>;
}

export function EmptyState({ title, detail }: { title: string; detail: string }) { return <div className="empty-state"><strong>{title}</strong><p>{detail}</p></div>; }
