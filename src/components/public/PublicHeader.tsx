"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { modules, navItems } from "./public-data";
import { PublicIcon } from "./PublicIcon";

export function Brand() {
  return <Link href="/" className="public-brand" aria-label="PROCESA Cloud, inicio"><span className="public-brand-mark"><i/><i/><i/></span><span><strong>PROCESA</strong><small>CLOUD</small></span></Link>;
}

export function PublicHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return <header className="public-header-wrap">
    <nav className="public-header" aria-label="Navegación principal">
      <Brand />
      <div className="public-nav-desktop">
        {navItems.map(item => "mega" in item && item.mega ? <div className="public-mega" key={item.href}>
          <Link className={pathname === item.href ? "active" : ""} href={item.href}>Módulos <span>⌄</span></Link>
          <div className="public-mega-panel">
            <div><p className="public-eyebrow">ECOSISTEMA MODULAR</p><h3>Una operación conectada.</h3><p>Activa lo que tu empresa necesita hoy. Todo comparte contexto, usuarios y datos.</p><Link className="public-text-link" href="/soluciones">Explorar soluciones →</Link></div>
            <div className="public-mega-grid">{modules.map(m => <Link href={`/soluciones#${m.id}`} key={m.id}><span className={`public-mini-icon ${m.color}`}><PublicIcon name={m.icon}/></span><span><b>{m.code}</b><small>{m.name}</small></span></Link>)}</div>
          </div>
        </div> : <Link className={pathname === item.href ? "active" : ""} href={item.href} key={item.href}>{item.label}</Link>)}
      </div>
      <div className="public-nav-actions">
        <span className="public-theme-chip"><PublicIcon name="moon" size={16}/> Noche</span>
        <Link className="public-corp-link" href="/procesa-corp">PROCESA CORP</Link>
        <Link className="public-login-link" href="/iniciar-sesion">Iniciar sesión</Link>
        <Link className="public-btn public-btn-small public-btn-ghost" href="/demo">Solicitar demo</Link>
        <Link className="public-btn public-btn-small" href="/crear-cuenta">Comenzar gratis</Link>
      </div>
      <button className="public-menu-button" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-label={open ? "Cerrar menú" : "Abrir menú"}><PublicIcon name={open ? "close" : "menu"}/></button>
    </nav>
    {open && <div className="public-mobile-nav">
      <div className="public-mobile-links">{navItems.map(item => <Link href={item.href} key={item.href} onClick={() => setOpen(false)}>{item.label}<span>→</span></Link>)}</div>
      <div className="public-mobile-modules">{modules.map(m => <Link href={`/soluciones#${m.id}`} key={m.id} onClick={() => setOpen(false)}>{m.code}</Link>)}</div>
      <Link href="/procesa-corp" onClick={() => setOpen(false)}>PROCESA CORP</Link>
      <Link href="/iniciar-sesion" onClick={() => setOpen(false)}>Iniciar sesión</Link>
      <Link className="public-btn public-btn-ghost" href="/demo" onClick={() => setOpen(false)}>Solicitar demo</Link>
      <Link className="public-btn" href="/crear-cuenta" onClick={() => setOpen(false)}>Comenzar gratis</Link>
    </div>}
  </header>;
}
