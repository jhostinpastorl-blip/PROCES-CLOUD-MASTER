"use client";

import Link from "next/link";
import { useState } from "react";
import { ProcesaLogo } from "@/components/ui/procesa-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const navItems = [
  ["#ecosistema", "Producto"],
  ["#soluciones", "Módulos"],
  ["#como-funciona", "Cómo funciona"],
  ["#multiempresa", "Multiempresa"],
  ["#seguridad", "Seguridad"],
  ["#faq", "FAQ"],
] as const;

export function LandingNav() {
  const [open, setOpen] = useState(false);

  const closeMenu = () => setOpen(false);

  return (
    <div className="landing-nav-wrapper">
      <header className="landing-nav glass-header">
        <Link href="#" className="landing-brand" aria-label="PROCESA Cloud, ir al inicio" onClick={closeMenu}>
          <ProcesaLogo />
        </Link>

        <nav className="landing-nav-links" aria-label="Navegación principal">
          {navItems.map(([href, label]) => (
            <a key={href} href={href} className="nav-item">
              {label}
            </a>
          ))}
        </nav>

        <div className="landing-actions">
          <ThemeToggle className="nav-theme-toggle" showLabel={false} />
          <a
            href="https://www.procesacorp.com/"
            target="_blank"
            rel="noreferrer"
            className="nav-corp-link"
          >
            PROCESA CORP ↗
          </a>
          <Link className="nav-login" href="/login">
            Iniciar sesión
          </Link>
          <Link className="pc-btn pc-btn-primary pc-btn-sm header-cta-btn" href="/demo">
            Solicitar demo <span className="cta-arrow" aria-hidden="true">→</span>
          </Link>
          <button
            type="button"
            className="landing-menu-toggle"
            aria-expanded={open}
            aria-controls="landing-mobile-menu"
            aria-label={open ? "Cerrar navegación" : "Abrir navegación"}
            onClick={() => setOpen((value) => !value)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        <div id="landing-mobile-menu" className={`landing-mobile-menu ${open ? "is-open" : ""}`}>
          <nav aria-label="Navegación móvil">
            {navItems.map(([href, label]) => (
              <a key={href} href={href} onClick={closeMenu}>
                {label}<span aria-hidden="true">↘</span>
              </a>
            ))}
          </nav>
          <div className="landing-mobile-actions">
            <Link href="/login" onClick={closeMenu}>Iniciar sesión</Link>
            <Link className="pc-btn pc-btn-primary pc-btn-md" href="/demo" onClick={closeMenu}>
              Solicitar demo
            </Link>
          </div>
        </div>
      </header>
    </div>
  );
}
