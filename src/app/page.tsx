import React from "react";
import Link from "next/link";
import { ProcesaLogo } from "@/components/ui/procesa-logo";
import { ProductHeroCarousel } from "@/components/landing/ProductHeroCarousel";
import { LandingMotion } from "@/components/landing/LandingMotion";
import { LandingNav } from "@/components/landing/LandingNav";
import { ECOSYSTEM_SOLUTIONS_CATALOG } from "@/config/product-experiences";

const faqs = [
  {
    q: "¿Qué es exactamente PROCESA Cloud?",
    a: "Es un ecosistema SaaS empresarial modular desarrollado por PROCESA CORP. En lugar de contratar múltiples programas aislados, activas un núcleo central común (Core) y enciendes únicamente las soluciones verticales que tu negocio necesita (POS, REST, CONTA, GYM, etc.).",
  },
  {
    q: "¿Mis datos se mezclan con los de otras empresas?",
    a: "De ninguna manera. PROCESA Cloud implementa una arquitectura multi-tenant con aislamiento estricto por empresa (company_id) y políticas Row-Level Security (RLS) en base de datos. La información de cada organización permanece herméticamente aislada.",
  },
  {
    q: "¿Puedo manejar varias empresas y sucursales con un solo usuario?",
    a: "Sí. Un único usuario puede pertenecer a múltiples empresas del grupo corporativo y alternar de contexto de forma instantánea sin cerrar sesión. Cada empresa administra sus propias sucursales, colaboradores y roles.",
  },
  {
    q: "¿Qué rol cumple VIERNES dentro del sistema?",
    a: "VIERNES es la capa de inteligencia transversal del ecosistema. No es un chatbot genérico: comprende la empresa, la sucursal y el rol de quien pregunta, respondiendo consultas sobre ventas, stock y operaciones con estricto respeto a los permisos de acceso.",
  },
  {
    q: "¿Necesito instalar servidores o programas locales?",
    a: "No. PROCESA Cloud opera 100% desde la nube, accesible mediante cualquier navegador moderno en computadoras, tablets o dispositivos móviles, optimizado para operar con rapidez en el punto de venta.",
  },
  {
    q: "¿Cómo se relaciona PROCESA Cloud con PROCESA CORP?",
    a: "PROCESA Cloud es el producto de software empresarial insignia diseñado, desarrollado y respaldado oficialmente por PROCESA CORP, bajo el lema corporativo: 'El futuro se procesa hoy.'",
  },
];

export default function Home() {
  return (
    <main className="landing-final">
      <LandingMotion />
      <LandingNav />

      {/* HERO V2: CARRUSEL MULTIPRODUCTO ESTRATÉGICO */}
      <section className="hero-final" data-reveal="hero">
        <div className="hero-v2-container">
          <ProductHeroCarousel />
        </div>
      </section>

      {/* STRIP DE MARCA & SOLUCIONES ESTRATÉGICAS */}
      <section className="proof-strip" aria-label="Capacidades verificadas" data-reveal>
        <span className="proof-strip-lead">Arquitectura preparada para operar con control</span>
        <div><i aria-hidden="true">◇</i><b>Multiempresa</b><small>Contextos separados</small></div>
        <div><i aria-hidden="true">⌘</i><b>Multisucursal</b><small>Operación conectada</small></div>
        <div><i aria-hidden="true">◎</i><b>Roles y permisos</b><small>Acceso por responsabilidad</small></div>
        <div><i aria-hidden="true">↗</i><b>Auditoría</b><small>Trazabilidad operativa</small></div>
      </section>

      {/* SECCIÓN #ecosistema: LA PLATAFORMA UNIFICADA */}
      <section id="ecosistema" className="landing-section intro-section" data-reveal>
        <div className="section-heading">
          <span>UNA PLATAFORMA, TODAS TUS CAPACIDADES</span>
          <h2>Una sola operación. Todas tus sedes conectadas.</h2>
          <p>
            Centraliza ventas, inventario, equipos y permisos alrededor de una misma empresa.
            Menos sistemas aislados; más control para decidir y crecer.
          </p>
        </div>

        <div className="value-grid">
          <article className="pc-card">
            <div className="pc-badge pc-badge-brand pc-badge-sm">01</div>
            <h3>Empieza con lo esencial</h3>
            <p>
              Configura empresa, sucursales y equipo; activa nuevas capacidades cuando tu operación las necesite.
            </p>
          </article>
          <article className="pc-card">
            <div className="pc-badge pc-badge-brand pc-badge-sm">02</div>
            <h3>Crece sin volver a empezar</h3>
            <p>
              Añade sedes y almacenes conservando el mismo contexto, catálogo y gobierno de acceso.
            </p>
          </article>
          <article className="pc-card">
            <div className="pc-badge pc-badge-brand pc-badge-sm">03</div>
            <h3>Cada persona ve lo necesario</h3>
            <p>
              Roles y permisos delimitan las acciones de cada colaborador dentro de su empresa y sucursal.
            </p>
          </article>
        </div>

        {/* DIAGRAMA CONCEPTUAL: TODO TU NEGOCIO CONECTADO */}
        <div className="connected-ecosystem-box">
          <div className="connected-hub-grid">
            <div className="connected-hub-copy">
              <span className="section-kicker section-kicker-gold">
                ARQUITECTURA DE ECOSISTEMA
              </span>
              <h3>Una base común para toda tu operación.</h3>
              <p>
                Los puntos de venta, las operaciones de restaurante, la contabilidad y la gestión de personal
                no son programas aislados. Funcionan integrados sobre el Core SaaS de PROCESA Cloud,
                compartiendo la misma empresa, sucursales y permisos.
              </p>
              <div className="hub-features-list">
                <div className="hub-feat-item">
                  <b>✓</b>
                  <span><strong>Una sola cuenta:</strong> Acceso centralizado a todos tus negocios y sucursales.</span>
                </div>
                <div className="hub-feat-item">
                  <b>✓</b>
                  <span><strong>Datos integrados:</strong> Las ventas del POS alimentan el Kardex y la contabilidad sin duplicar registros.</span>
                </div>
                <div className="hub-feat-item">
                  <b>✓</b>
                  <span><strong>Seguridad compartida:</strong> Roles, permisos y auditoría inmutable en cada operación.</span>
                </div>
              </div>
            </div>

            <div className="connected-diagram-card">
              <div className="diagram-center-core">
                <h5>PROCESA CLOUD CORE</h5>
                <p>Empresa · Sucursales · Usuarios · Roles · Auditoría</p>
              </div>
              <div className="diagram-satellites-grid">
                <div className="diagram-sat-chip">PROCESA POS</div>
                <div className="diagram-sat-chip">PROCESA REST</div>
                <div className="diagram-sat-chip">PROCESA CONTA</div>
                <div className="diagram-sat-chip">PROCESA GYM</div>
                <div className="diagram-sat-chip">PROCESA VET</div>
                <div className="diagram-sat-chip">PROCESA RRHH</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN #soluciones: CATÁLOGO DE SOLUCIONES POR CATEGORÍA */}
      <section id="soluciones" className="landing-section modules-section surface-section" data-reveal>
        <div className="section-heading center">
          <span>CATÁLOGO DE SOLUCIONES</span>
          <h2>Explora un ecosistema que crece contigo.</h2>
          <p>
            Conoce las capacidades disponibles y el roadmap de productos de PROCESA CORP,
            claramente identificado por etapa.
          </p>
        </div>

        {ECOSYSTEM_SOLUTIONS_CATALOG.map((cat) => (
          <div key={cat.title} className="solutions-category-group">
            <div className="category-group-header">
              <h3>{cat.title}</h3>
              <p>{cat.description}</p>
            </div>
            <div className="catalog-cards-grid">
              {cat.products.map((p) => (
                <article key={p.code} className="catalog-product-card">
                  <div>
                    <div className="card-top-row">
                      <span className="pc-badge pc-badge-brand pc-badge-sm">{p.code}</span>
                      <span className={`pc-badge pc-badge-${p.statusTone} pc-badge-sm`}>
                        {p.statusLabel}
                      </span>
                    </div>
                    <h4>{p.name}</h4>
                    <p className="card-desc">{p.description}</p>
                  </div>
                  <div className="card-industries">
                    <span>Sector: {p.targetIndustries}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* SECCIÓN #como-funciona: ONBOARDING PROGRESIVO */}
      <section id="como-funciona" className="how-section" data-reveal>
        <div className="how-copy">
          <span>FLUJO TRANSPARENTE</span>
          <h2>De tu cuenta a una operación organizada.</h2>
          <p>
            El registro inicial estructura la identidad y permisos de tu organización.
            Una vez configurada, puedes expandir sucursales y módulos según tu ritmo de crecimiento.
          </p>
        </div>

        <div className="how-steps">
          {[
            ["1", "Crea tu cuenta empresarial", "Acceso seguro verificado mediante correo corporativo."],
            ["2", "Configura tu empresa", "Razón social, RUC o identificador tributario y plan inicial."],
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

      {/* SECCIÓN #multiempresa: MULTIEMPRESA Y MULTISUCURSAL */}
      <section id="multiempresa" className="landing-section surface-section" data-reveal>
        <div className="section-heading center">
          <span>ARQUITECTURA MULTISEDE Y MULTITENANT</span>
          <h2>Diseñado para grupos corporativos y empresas en expansión.</h2>
          <p>
            Administra una o varias empresas desde una sola cuenta y mantén tus sucursales conectadas
            con total separación de información.
          </p>
        </div>

        <div className="multi-company-grid">
          <div className="pc-card">
            <h4>Administra una o varias empresas</h4>
            <p>
              Alterna entre tu Empresa A y tu Empresa B sin cerrar sesión. El selector de
              contexto valida tus membresías activas instantáneamente.
            </p>
          </div>
          <div className="pc-card">
            <h4>Conecta tus sucursales</h4>
            <p>
              Cada sucursal posee código operativo, dirección y configuración propia. Las cajas y
              el inventario se supervisan de forma local o consolidada.
            </p>
          </div>
          <div className="pc-card">
            <h4>Módulos independientes por empresa</h4>
            <p>
              Una empresa de tu grupo puede operar con PROCESA POS y REST, mientras otra
              utiliza únicamente CONTA y RRHH. Flexibilidad comercial total.
            </p>
          </div>
        </div>
      </section>

      {/* SECCIÓN VIERNES: INTELIGENCIA TRANSVERSAL */}
      <section className="viernes-section" data-reveal>
        <div>
          <span>VIERNES · INTELIGENCIA DE NEGOCIO</span>
          <h2>Pregunta por tu negocio.<br />Con contexto y permisos reales.</h2>
          <p>
            Viernes convierte el contexto de tu empresa, sucursal y permisos en respuestas
            operativas útiles. Su experiencia se presenta como una capacidad en evolución.
          </p>
          <div style={{ marginTop: 24 }}>
            <Link className="pc-btn pc-btn-white pc-btn-md" href="/demo">
              Conocer más sobre Viernes
            </Link>
          </div>
        </div>

        <div className="viernes-prompts">
          <span>¿Cuánto vendió hoy la sucursal Principal?</span>
          <span>¿Qué productos tienen stock por debajo del punto de reorden?</span>
          <span>¿Cuáles son las facturas por cobrar con vencimiento esta semana?</span>
          <span>¿Cuántas mesas activas registran pedidos en comanda?</span>
        </div>
      </section>

      {/* SECCIÓN #planes: PLANES ESCALABLES */}
      <section id="planes" className="landing-section pricing-section" data-reveal>
        <div className="section-heading center">
          <span>PLANES PREPARADOS PARA ESCALAR</span>
          <h2>Empieza simple. Crece cuando lo necesites.</h2>
          <p>
            Desde negocios individuales hasta empresas con múltiples sedes.
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
            <p>Múltiples sucursales, más colaboradores, módulos comerciales y soporte prioritario.</p>
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
      <section id="seguridad" className="security-section" data-reveal>
        <div className="security-panel">
          <span>SEGURIDAD ARQUITECTÓNICA</span>
          <h2>Información aislada y protegida por empresa.</h2>
          <p>
            PROCESA Cloud valida identidad, empresa, membresía, sucursal y permisos
            antes de autorizar cualquier operación en el sistema.
          </p>

          <div className="security-grid">
            {[
              "Aislamiento Multi-Tenant estricto por empresa",
              "Políticas de seguridad a nivel de motor de base de datos",
              "54 permisos granulares de control de acceso",
              "Sesiones autenticadas y controles de acceso",
              "Registro de auditoría para operaciones sensibles",
              "Control Plane Super Admin aislado para PROCESA CORP",
            ].map((item) => (
              <div key={item}>✓ {item}</div>
            ))}
          </div>
        </div>

        <div className="security-visual">
          {[
            ["AUTENTICACIÓN", "Sesión validada con Supabase Auth"],
            ["CONTEXTO EMPRESA", "Identificador company_id verificado"],
            ["SUCURSAL ACTIVA", "Permisos de local y operaciones asignados"],
            ["SEGURIDAD RLS", "Filtro hermético a nivel de PostgreSQL"],
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
      <section id="faq" className="landing-section faq-section" data-reveal>
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
                <span style={{ color: "var(--pc-blue, #1b2c54)", fontSize: 18 }}>+</span>
              </summary>
              <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--pc-text-muted)", lineHeight: 1.6 }}>
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final-cta" data-reveal>
        <span>PROCESA CLOUD · PROCESA CORP</span>
        <h2>
          Conecta tu empresa.<br />
          Controla la operación que sigue.
        </h2>
        <p>
          Organiza empresa, sucursales y equipo en un mismo entorno; activa nuevas capacidades a tu ritmo.
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
          <a href="#soluciones">Catálogo de Soluciones</a>
          <a href="#ecosistema">Qué es PROCESA Cloud</a>
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
          <a href="#seguridad">Seguridad & Aislamiento</a>
          <a href="#faq">Preguntas frecuentes</a>
        </div>

        <div className="footer-bottom">
          <span>© 2026 PROCESA CORP. Todos los derechos reservados.</span>
          <span style={{ color: "var(--pc-blue, #1b2c54)", fontWeight: 700 }}>
            El futuro se procesa hoy.
          </span>
        </div>
      </footer>
    </main>
  );
}
