import Link from "next/link";
import { PublicHeader, Brand } from "./PublicHeader";
import { PublicIcon } from "./PublicIcon";
import { modules } from "./public-data";

export function PublicShell({ children, compact = false }: { children: React.ReactNode; compact?: boolean }) {
  return <div className={`public-site${compact ? " public-site-compact" : ""}`}>
    <div className="public-aurora public-aurora-one"/><div className="public-aurora public-aurora-two"/>
    <PublicHeader />
    {children}
    <PublicFooter />
  </div>;
}

export function PublicFooter() {
  return <footer className="public-footer">
    <div className="public-footer-main">
      <div><Brand/><p>El sistema operativo modular para empresas que no pueden detenerse.</p></div>
      <div><h4>Producto</h4><Link href="/producto">Plataforma</Link><Link href="/como-funciona">Cómo funciona</Link><Link href="/precios">Precios</Link><Link href="/seguridad">Seguridad</Link></div>
      <div><h4>Módulos</h4>{modules.slice(0,5).map(m => <Link href={`/soluciones#${m.id}`} key={m.id}>{m.code} · {m.name}</Link>)}</div>
      <div><h4>Empresa</h4><Link href="/procesa-corp">PROCESA CORP</Link><Link href="/recursos">Recursos</Link><Link href="/demo">Solicitar demo</Link><Link href="/iniciar-sesion">Iniciar sesión</Link></div>
    </div>
    <div className="public-footer-bottom"><span>© 2026 PROCESA CORP. Todos los derechos reservados.</span><span><PublicIcon name="shield" size={15}/> Infraestructura segura · Aislamiento por empresa</span></div>
  </footer>;
}

export function PageHero({ eyebrow, title, gradient, description, children }: { eyebrow: string; title: string; gradient?: string; description: string; children?: React.ReactNode }) {
  return <section className="public-page-hero public-container"><p className="public-pill">{eyebrow}</p><h1>{title} {gradient && <span className="public-gradient-text">{gradient}</span>}</h1><p className="public-lead">{description}</p>{children}</section>;
}

export function SectionTitle({ eyebrow, title, description, center = false }: { eyebrow: string; title: string; description?: string; center?: boolean }) {
  return <div className={`public-section-title${center ? " center" : ""}`}><p className="public-eyebrow">{eyebrow}</p><h2>{title}</h2>{description && <p>{description}</p>}</div>;
}

export function CtaBand({ title = "Tu empresa puede operar mejor desde hoy.", text = "Descubre qué combinación de módulos se adapta a tu operación.", primary = "Solicitar demo", primaryHref = "/demo" }: { title?: string; text?: string; primary?: string; primaryHref?: string }) {
  return <section className="public-cta public-container"><div><p className="public-eyebrow">EMPIEZA A PROCESAR</p><h2>{title}</h2><p>{text}</p></div><div className="public-button-row"><Link className="public-btn" href={primaryHref}>{primary} <PublicIcon name="arrow" size={17}/></Link><Link className="public-btn public-btn-ghost" href="/crear-cuenta">Comenzar gratis</Link></div></section>;
}
