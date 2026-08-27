import React from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ProcesaLogo } from "@/components/ui/procesa-logo";
import { HeroLiveEngine } from "@/components/landing/HeroLiveEngine";

const modules = [
  {
    code: "CORE",
    name: "PROCESA Cloud Core",
    desc: "Núcleo transversal: empresas, sucursales, usuarios, roles, permisos granulares y auditoría inmutable.",
    badge: "Activo en Producción",
    tone: "success",
    phase: "Fase 0",
  },
  {
    code: "POS",
    name: "Punto de Venta & Caja",
    desc: "Ventas rápidas, turnos de caja, inventario con alertas de reposición, clientes y emisión comercial.",
    badge: "Fase 1 · En Desarrollo",
    tone: "info",
    phase: "Fase 1",
  },
  {
    code: "REST",
    name: "Restaurantes & Gastronomía",
    desc: "Plano interactivo de mesas, comandas automáticas a cocina, control de mozos, pedidos y delivery.",
    badge: "Fase 2 · Roadmap",
    tone: "neutral",
    phase: "Fase 2",
  },
  {
    code: "CONTA",
    name: "Finanzas & Contabilidad",
    desc: "Contabilidad en tiempo real conectada a tus ventas y compras diarias, sin duplicidad de asientos.",
    badge: "Fase 3 · Roadmap",
    tone: "neutral",
    phase: "Fase 3",
  },
  {
    code: "FLOW",
    name: "Automatización de Procesos",
    desc: "Workflows empresariales, aprobaciones jerárquicas y disparadores de eventos automáticos.",
    badge: "Fase 4 · Roadmap",
    tone: "neutral",
    phase: "Fase 4",
  },
  {
    code: "DOCS",
    name: "Gestión Documental & Drive",
    desc: "Expedientes corporativos, control de vencimientos y almacenamiento sincronizado con Google Drive.",
    badge: "Próximamente",
    tone: "neutral",
    phase: "Core Add-on",
  },
  {
    code: "VIERNES",
    name: "Inteligencia Transversal AI",
    desc: "Asistente que responde preguntas de negocio respetando empresa, sucursal activa y permisos de rol.",
    badge: "Capa Inteligente",
    tone: "warning",
    phase: "Transversal",
  },
];

const faqs = [
  {
    q: "¿Qué es exactamente PROCESA Cloud?",
    a: "Es una plataforma SaaS empresarial modular desarrollada por PROCESA CORP. En lugar de contratar múltiples programas aislados, activas un núcleo central común (Core) y enciendes únicamente los módulos que tu negocio necesita (POS, REST, Contabilidad, etc.).",
  },
  {
    q: "¿Mis datos se mezclan con los de otras empresas?",
    a: "De ninguna manera. PROCESA Cloud implementa una arquitectura multi-tenant estricta con Row Level Security (RLS) en base de datos. Cada consulta y acción está aislada por el identificador único de tu empresa (company_id).",
  },
  {
    q: "¿Puedo manejar varias empresas y sucursales con un solo usuario?",
    a: "Sí. Un único usuario puede pertenecer a varias empresas del grupo corporativo y alternar de contexto de forma instantánea. Cada empresa define sus propias sucursales, roles y módulos contratados.",
  },
  {
    q: "¿Qué rol cumple VIERNES dentro del sistema?",
    a: "VIERNES es la capa de inteligencia transversal del ecosistema. No es un chatbot genérico: comprende la empresa, la sucursal y el rol de quien pregunta, consultando métricas reales como ventas, stock y pendientes con estricto respeto a los permisos.",
  },
  {
    q: "¿Necesito instalar servidores o programas locales?",
    a: "No. PROCESA Cloud opera 100% desde la nube accesible mediante cualquier navegador moderno en computadoras, tablets o dispositivos móviles, con capacidades progresivas para operar sin fricción.",
  },
  {
    q: "¿Cómo se relaciona PROCESA Cloud con PROCESA CORP?",
    a: "PROCESA Cloud es el producto de software empresarial insignia diseñado, desarrollado y respaldado oficialmente por PROCESA CORP, bajo el lema: 'El futuro se procesa hoy.'",
  },
];

export default function Home() {
  return (
    <main className="landing-final">
      {/* HEADER PÚBLICO */}
      <header className="landing-nav">
        <Link href="/" className="landing-brand" aria-label="PROCESA Cloud Inicio">
          <ProcesaLogo />
        </Link>
        <nav aria-label="Navegación principal">
          <a href="#producto">Producto</a>
          <a href="#modulos">Módulos</a>
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#multiempresa">Multiempresa</a>
          <a href="#planes">Planes</a>
          <a href="#seguridad">Seguridad</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="landing-actions">
          <ThemeToggle />
          <a
            className="corp-link"
            href="https://www.procesacorp.com/"
            target="_blank"
            rel="noreferrer"
          >
            PROCESA CORP ↗
          </a>
          <Link className="nav-login" href="/login">
            Iniciar sesión
          </Link>
          <Link className="pc-btn pc-btn-primary pc-btn-sm" href="/demo">
            Solicitar demo
          </Link>
        </div>
      </header>

      {/* HERO WOW: TU EMPRESA PROCESÁNDOSE EN TIEMPO REAL */}
      <section className="hero-final">
        <div className="hero-final-copy">
          <span className="eyebrow-pill">
            PROCESA CLOUD · ECOSISTEMA EMPRESARIAL MODULAR
          </span>
          <h1>
            Tu empresa.<br />
            <em>Procesándose en tiempo real.</em>
          </h1>
          <p>
            Centraliza operaciones, puntos de venta, control de sedes, finanzas y
            automatización en una sola nube de <strong>PROCESA CORP</strong>. Diseñada para
            crecer contigo con el estándar: <em>El futuro se procesa hoy.</em>
          </p>

          <div className="hero-actions">
            <Link className="pc-btn pc-btn-primary pc-btn-lg" href="/registro">
              Empezar gratis
            </Link>
            <Link className="pc-btn pc-btn-secondary pc-btn-lg" href="/demo">
              Solicitar demo
            </Link>
          </div>

          <div className="trust-row">
            <span>✓ Multiempresa nativo</span>
            <span>✓ Multisucursal sin límites</span>
            <span>✓ Aislamiento RLS blindado</span>
            <span>✓ Arquitectura modular</span>
          </div>
        </div>

        <div className="hero-final-product">
          <HeroLiveEngine />
        </div>
      </section>

      {/* PROOF & SATELLITES STRIP */}
      <section className="proof-strip">
        <span>Ecosistema empresarial oficial de PROCESA CORP:</span>
        <b>CORE</b>
        <b>POS</b>
        <b>REST</b>
        <b>CONTA</b>
        <b>FLOW</b>
        <b>DOCS</b>
        <b>VIERNES AI</b>
      </section>

      {/* SECCIÓN #producto: LA PLATAFORMA UNIFICADA */}
      <section id="producto" className="landing-section intro-section">
        <div className="section-heading">
          <span>UNA PLATAFORMA, TODAS TUS CAPACIDADES</span>
          <h2>Deja de operar con sistemas desconectados.</h2>
          <p>
            Tradicionalmente las empresas contratan un software para facturar, otro
            para restaurantes, planillas en hojas de cálculo y archivos dispersos.
            PROCESA Cloud unifica todo alrededor de una base común: tu empresa, tus
            sucursales, tus equipos y tus permisos.
          </p>
        </div>

        <div className="value-grid">
          <article className="pc-card">
            <div className="pc-badge pc-badge-brand pc-badge-sm">01</div>
            <h3>Activa solo lo que necesitas</h3>
            <p>
              Comienza con el Core administrativo y enciende módulos comerciales
              (POS, REST, CONTA, FLOW) a medida que tu operativa lo demande.
            </p>
          </article>
          <article className="pc-card">
            <div className="pc-badge pc-badge-brand pc-badge-sm">02</div>
            <h3>Crece sin migrar de sistema</h3>
            <p>
              Añade nuevas sucursales, almacenes, miembros de equipo y líneas de
              negocio manteniendo tus catálogos y reportes consolidados.
            </p>
          </article>
          <article className="pc-card">
            <div className="pc-badge pc-badge-brand pc-badge-sm">03</div>
            <h3>Gobierno y roles granulares</h3>
            <p>
              Autorización validada estrictamente en servidor y base de datos. Cada
              colaborador accede exclusivamente a lo que su función autoriza.
            </p>
          </article>
        </div>
      </section>

      {/* SECCIÓN #modulos: ECOSISTEMA MODULAR & ROADMAP */}
      <section id="modulos" className="landing-section modules-section">
        <div className="section-heading center">
          <span>ECOSISTEMA MODULAR PROCESA CLOUD</span>
          <h2>Módulos para operar hoy y crecer mañana.</h2>
          <p>
            Una base sólida y desacoplada. Conoce el estado real de cada producto dentro
            del roadmap tecnológico de PROCESA CORP.
          </p>
        </div>

        <div className="feature-grid final-modules">
          {modules.map((m) => (
            <article key={m.code} className="pc-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span className="pc-badge pc-badge-brand pc-badge-sm">{m.code}</span>
                <span className={`pc-badge pc-badge-${m.tone} pc-badge-sm`}>
                  {m.badge}
                </span>
              </div>
              <h3 style={{ margin: "6px 0 10px", fontSize: 18 }}>{m.name}</h3>
              <p style={{ fontSize: 13, color: "var(--pc-text-muted)", lineHeight: 1.6, minHeight: 60 }}>
                {m.desc}
              </p>
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--pc-border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <small style={{ fontSize: 11, color: "var(--pc-text-light)" }}>{m.phase}</small>
                <a href="#como-funciona" style={{ fontSize: 12, color: "var(--pc-blue)", fontWeight: 700 }}>
                  Ver flujo →
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* SECCIÓN #como-funciona: ONBOARDING PROGRESIVO */}
      <section id="como-funciona" className="how-section">
        <div className="how-copy">
          <span>FLUJO TRANSPARENTE</span>
          <h2>De la cuenta a la operación en 5 pasos claros.</h2>
          <p>
            El onboarding inicial estructura la identidad y permisos de tu organización.
            Una vez configurada, puedes expandir sucursales y módulos sin fricción.
          </p>
        </div>

        <div className="how-steps">
          {[
            ["1", "Crea tu cuenta empresarial", "Acceso seguro verificado mediante correo corporativo."],
            ["2", "Configura tu empresa", "Razón social, RUC/identificador tributario y plan inicial."],
            ["3", "Activa tus módulos", "Selecciona las capacidades iniciales requeridas para tu equipo."],
            ["4", "Define tu primera sucursal", "Configura local comercial, almacén principal o sede central."],
            ["5", "Ingresa al Dashboard", "Invita colaboradores con roles asignados y empieza a operar."],
          ].map((x) => (
            <article key={x[0]}>
              <i>{x[0]}</i>
              <div>
                <h3>{x[1]}</h3>
                <p>{x[2]}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* SECCIÓN MULTIEMPRESA & MULTISUCURSAL */}
      <section id="multiempresa" className="landing-section" style={{ background: "var(--pc-bg-subtle)" }}>
        <div className="section-heading center">
          <span>ARQUITECTURA MULTISEDE Y MULTITENANT</span>
          <h2>Diseñado para grupos corporativos y empresas en expansión.</h2>
          <p>
            Un único inicio de sesión para administrar múltiples razones sociales,
            sucursales locales o franquicias con total separación de datos.
          </p>
        </div>

        <div style={{ maxWidth: 960, margin: "40px auto 0", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          <div className="pc-card">
            <h4 style={{ margin: "0 0 8px", fontSize: 16 }}>Cambio de contexto en un clic</h4>
            <p style={{ fontSize: 13, color: "var(--pc-text-muted)", lineHeight: 1.6 }}>
              Alterna entre tu Empresa A y tu Empresa B sin cerrar sesión. El selector de
              contexto valida tus membresías activas instantáneamente.
            </p>
          </div>
          <div className="pc-card">
            <h4 style={{ margin: "0 0 8px", fontSize: 16 }}>Sucursales con códigos únicos</h4>
            <p style={{ fontSize: 13, color: "var(--pc-text-muted)", lineHeight: 1.6 }}>
              Cada sucursal posee código operativo, horario y configuración propia. El
              stock y las cajas se pueden supervisar de forma local o consolidada.
            </p>
          </div>
          <div className="pc-card">
            <h4 style={{ margin: "0 0 8px", fontSize: 16 }}>Módulos independientes</h4>
            <p style={{ fontSize: 13, color: "var(--pc-text-muted)", lineHeight: 1.6 }}>
              Una empresa de tu grupo puede tener activo POS y REST, mientras otra
              utiliza únicamente CONTA y FLOW. Flexibilidad comercial total.
            </p>
          </div>
        </div>
      </section>

      {/* SECCIÓN VIERNES: INTELIGENCIA TRANSVERSAL */}
      <section className="viernes-section">
        <div>
          <span>VIERNES · INTELIGENCIA DE NEGOCIO</span>
          <h2>Pregunta por tu negocio.<br />Con contexto y permisos reales.</h2>
          <p>
            Viernes no es un chatbot decorativo. Es el asistente inteligente transversal
            de PROCESA Cloud diseñado para consultar indicadores operativos respetando
            siempre la empresa activa, la sucursal y los permisos del colaborador.
          </p>
          <div style={{ marginTop: 24 }}>
            <Link className="pc-btn pc-btn-white pc-btn-md" href="/demo">
              Conocer más sobre Viernes
            </Link>
          </div>
        </div>

        <div className="viernes-prompts">
          <span>¿Cuánto vendió hoy la sucursal Principal?</span>
          <span>¿Qué insumos están por debajo del punto de reorden?</span>
          <span>¿Cuáles son las facturas por cobrar con vencimiento esta semana?</span>
          <span>¿Cuántas mesas activas registran más de 45 minutos en comanda?</span>
        </div>
      </section>

      {/* SECCIÓN #planes: PLANES ESCALABLES */}
      <section id="planes" className="landing-section pricing-section">
        <div className="section-heading center">
          <span>PLANES PREPARADOS PARA ESCALAR</span>
          <h2>Empieza simple. Crece cuando lo necesites.</h2>
          <p>
            Desde startups individuales hasta corporaciones con múltiples sedes.
            Los precios definitivos serán publicados antes del lanzamiento general.
          </p>
        </div>

        <div className="pricing-grid">
          <article className="pc-card">
            <span className="pc-badge pc-badge-neutral pc-badge-sm">FREE</span>
            <h3>Para comenzar</h3>
            <b>S/ 0</b>
            <p>1 empresa, 1 sucursal, hasta 2 usuarios. Ideal para explorar el Core.</p>
            <Link className="pc-btn pc-btn-secondary pc-btn-md" style={{ width: "100%" }} href="/registro">
              Empezar ahora
            </Link>
          </article>

          <article className="pc-card featured">
            <em>MÁS ELEGIDO</em>
            <span className="pc-badge pc-badge-brand pc-badge-sm">PRO</span>
            <h3>Empresas en crecimiento</h3>
            <b>Próximamente</b>
            <p>Múltiples sucursales, más usuarios, módulos comerciales y soporte prioritario.</p>
            <Link className="pc-btn pc-btn-primary pc-btn-md" style={{ width: "100%" }} href="/demo">
              Solicitar demo
            </Link>
          </article>

          <article className="pc-card">
            <span className="pc-badge pc-badge-neutral pc-badge-sm">BUSINESS</span>
            <h3>Corporativo & Franquicias</h3>
            <b>Personalizado</b>
            <p>Capacidad para grandes operaciones, auditoría extendida y asistencia dedicada.</p>
            <Link className="pc-btn pc-btn-secondary pc-btn-md" style={{ width: "100%" }} href="/demo">
              Hablar con PROCESA
            </Link>
          </article>
        </div>
      </section>

      {/* SECCIÓN #seguridad: SEGURIDAD DESDE EL CORE */}
      <section id="seguridad" className="security-section">
        <div className="security-panel">
          <span>SEGURIDAD ARQUITECTÓNICA</span>
          <h2>La seguridad no es una capa decorativa.</h2>
          <p>
            PROCESA Cloud valida identidad, empresa, membresía, sucursal y permisos
            antes de autorizar cualquier operación sensible en el sistema.
          </p>

          <div className="security-grid">
            {[
              "Aislamiento Multi-Tenant estricto",
              "Políticas RLS en base de datos PostgreSQL",
              "16 capacidades de permisos granulares",
              "Sesiones cifradas y autenticación segura",
              "Registro inmutable de auditoría para eventos clave",
              "Super Admin aislado con guardia de plataforma",
            ].map((item) => (
              <div key={item}>✓ {item}</div>
            ))}
          </div>
        </div>

        <div className="security-visual">
          {[
            ["AUTENTICACIÓN", "Sesión validada con Supabase Auth"],
            ["CONTEXTO EMPRESA", "Identificador company_id verificado"],
            ["SUCURSAL ACTIVA", "Permisos de local u operaciones asignados"],
            ["POLÍTICA RLS", "Filtro a nivel de motor de base de datos"],
          ].map((x, i) => (
            <div key={x[0]}>
              <span>{x[0]}</span>
              <b>{x[1]}</b>
              {i < 3 && <i>↓</i>}
            </div>
          ))}
        </div>
      </section>

      {/* SECCIÓN #faq: PREGUNTAS FRECUENTES */}
      <section id="faq" className="landing-section faq-section">
        <div className="section-heading">
          <span>PREGUNTAS FRECUENTES</span>
          <h2>Todo lo que necesitas saber antes de empezar.</h2>
          <p>Respuestas claras sobre la tecnología, privacidad y modelo de PROCESA Cloud.</p>
        </div>

        <div className="faq-grid">
          {faqs.map((f) => (
            <details key={f.q} className="pc-card" style={{ padding: "0 20px" }}>
              <summary style={{ padding: "18px 0", cursor: "pointer", fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{f.q}</span>
                <span style={{ color: "var(--pc-blue)", fontSize: 18 }}>+</span>
              </summary>
              <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--pc-text-muted)", lineHeight: 1.6 }}>
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final-cta">
        <span>PROCESA CLOUD · PROCESA CORP</span>
        <h2>
          Haz que tu empresa opere<br />
          como una sola plataforma unificada.
        </h2>
        <p>
          Comienza con el Core, activa los módulos que requieres y escala sin cambiar de software.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
          <Link className="pc-btn pc-btn-white pc-btn-lg" href="/registro">
            Crear cuenta empresarial
          </Link>
          <Link className="pc-btn pc-btn-outline pc-btn-lg" href="/demo">
            Solicitar demo
          </Link>
        </div>
      </section>

      {/* FOOTER CORPORATIVO */}
      <footer className="landing-footer">
        <div>
          <ProcesaLogo />
          <p style={{ marginTop: 12, fontSize: 12, color: "var(--pc-text-muted)", maxWidth: 320, lineHeight: 1.6 }}>
            Plataforma SaaS empresarial modular de <strong>PROCESA CORP</strong>. Gestión,
            operaciones y automatización bajo la promesa: <em>El futuro se procesa hoy.</em>
          </p>
        </div>

        <div>
          <h4>Plataforma</h4>
          <a href="#producto">Qué es PROCESA Cloud</a>
          <a href="#modulos">Catálogo de Módulos</a>
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#planes">Planes y Precios</a>
          <Link href="/login">Iniciar sesión</Link>
          <Link href="/registro">Crear cuenta</Link>
        </div>

        <div>
          <h4>Empresa & Confianza</h4>
          <a href="https://www.procesacorp.com/" target="_blank" rel="noreferrer">
            PROCESA CORP Corporativo ↗
          </a>
          <Link href="/demo">Solicitar demostración</Link>
          <a href="#seguridad">Seguridad & RLS</a>
          <a href="#faq">Preguntas frecuentes</a>
        </div>

        <div className="footer-bottom">
          <span>© 2026 PROCESA CORP. Todos los derechos reservados.</span>
          <span style={{ color: "var(--pc-blue)", fontWeight: 700 }}>
            El futuro se procesa hoy.
          </span>
        </div>
      </footer>
    </main>
  );
}