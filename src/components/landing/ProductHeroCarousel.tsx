"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { HERO_PRODUCT_EXPERIENCES, ProductExperience } from "@/config/product-experiences";

export function ProductHeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const currentProduct: ProductExperience = HERO_PRODUCT_EXPERIENCES[currentIndex];
  const isLeadExperience = currentIndex === 0;
  const heroLead = isLeadExperience ? "PROCESA CLOUD" : currentProduct.name;
  const heroHeadline = isLeadExperience ? "Tu empresa." : currentProduct.headline;
  const heroEmphasis = isLeadExperience ? "Procesándose en tiempo real." : currentProduct.headlineEmphasis;
  const heroDescription = isLeadExperience
    ? "Centraliza ventas, inventario, sucursales y control operativo en un ecosistema empresarial modular."
    : currentProduct.description;
  const heroSector = isLeadExperience ? "Ecosistema empresarial modular" : currentProduct.sector;
  const heroStatus = isLeadExperience ? "Producto en evolución · Vista demostrativa" : currentProduct.statusLabel;
  const heroFeatures = isLeadExperience ? ["Ventas", "Sucursales", "Inventario", "Control"] : currentProduct.features;
  const primaryCta = isLeadExperience ? { label: "Comenzar gratis", href: "/registro" } : currentProduct.primaryCta;
  const secondaryCta = isLeadExperience ? { label: "Solicitar demo", href: "/demo" } : currentProduct.secondaryCta;

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? HERO_PRODUCT_EXPERIENCES.length - 1 : prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === HERO_PRODUCT_EXPERIENCES.length - 1 ? 0 : prev + 1));
  }, []);

  return (
    <div
      className="hero-carousel-wrapper"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") handlePrev();
        if (event.key === "ArrowRight") handleNext();
      }}
      style={
        {
          "--product-accent": currentProduct.accentColor,
          "--product-glow": currentProduct.accentGlow,
          "--product-badge": currentProduct.accentBadge,
        } as React.CSSProperties
      }
      role="region"
      aria-roledescription="carrusel"
      aria-label="Ecosistema de Soluciones PROCESA Cloud"
    >
      {/* NAVEGACIÓN SUPERIOR DE PRODUCTOS (PILLS DEL ECOSISTEMA) */}
      <nav className="carousel-product-selector" aria-label="Seleccionar solución del ecosistema">
        {HERO_PRODUCT_EXPERIENCES.map((p, idx) => {
          const isActive = idx === currentIndex;
          return (
            <button
              key={p.id}
              type="button"
              className={`product-pill-tab ${isActive ? "active" : ""}`}
              onClick={() => setCurrentIndex(idx)}
              aria-pressed={isActive}
              aria-label={`Ver solución ${p.name}`}
            >
              <span className="pill-dot" />
              <span className="pill-name">{p.shortName}</span>
              {p.id === "pos" && <span className="pill-badge-priority">P1</span>}
            </button>
          );
        })}
      </nav>

      {/* CONTENIDO PRINCIPAL DEL SLIDE ACTIVO */}
      <div className="hero-slide-grid" aria-live="polite">
        {/* COLUMNA IZQUIERDA: COPY COMERCIAL Y CTAs */}
        <div className="hero-slide-copy">
          <div className="eyebrow-container">
            <span className="eyebrow-sector">
              <i className="sector-icon">◆</i> {heroSector}
            </span>
            <span className={`status-pill tone-${currentProduct.statusTone}`}>
              {heroStatus}
            </span>
          </div>

          <h1 className="hero-heading">
            <span className="heading-brand-lead">{heroLead}</span>
            <br />
            <span className="heading-white-line">{heroHeadline}</span>
            <br />
            <span className="heading-gradient-line">{heroEmphasis}</span>
          </h1>

          <p className="hero-desc">
            {heroDescription}{" "}
            <span className="hero-slogan-accent">El futuro se procesa hoy.</span>
          </p>

          <div className="hero-feature-tags" aria-label="Capacidades principales">
            {heroFeatures.map((feat) => (
              <span key={feat} className="feature-tag-chip">
                <span className="check-mark">✓</span> {feat}
              </span>
            ))}
          </div>

          <div className="hero-actions-row">
            <Link className="pc-btn pc-btn-primary pc-btn-lg hero-cta-btn" href={primaryCta.href}>
              {primaryCta.label} <span className="cta-arrow" aria-hidden="true">→</span>
            </Link>
            <Link className="pc-btn pc-btn-secondary pc-btn-lg hero-cta-secondary" href={secondaryCta.href}>
              {secondaryCta.label}
            </Link>
          </div>

          <div className="trust-pills-row">
            <span>✓ Multiempresa nativo</span>
            <span>✓ Multisucursal</span>
            <span>✓ Roles y permisos</span>
            <span>✓ Auditoría operativa</span>
          </div>
        </div>

        {/* COLUMNA DERECHA: VENTANA DE PRODUCTO ENTERPRISE */}
        <div className="hero-slide-visual">
          <div className="mockup-shell">
            <div className="mockup-frame">
              {/* BARRA SUPERIOR DE VENTANA */}
              <div className="mockup-chrome">
                <div className="chrome-controls">
                  <span className="dot dot-red" />
                  <span className="dot dot-yellow" />
                  <span className="dot dot-green" />
                </div>
                <div className="chrome-url">
                  <span className="lock-icon">🔒</span>
                  <span>app.procesacloud.com/{currentProduct.id}</span>
                </div>
                <span className="chrome-badge-interactive">DEMO · {currentProduct.visual.badgeText}</span>
              </div>

              {/* CUERPO INTERNO ESTILO APLICACIÓN */}
              <div className="mockup-workspace">
                <aside className="mockup-sidebar" aria-label="Vista demostrativa de navegación">
                  <div className="mockup-sidebar-brand">PC</div>
                  {[
                    ["⌂", "Inicio"],
                    ["▣", "Operaciones"],
                    ["◇", "Inventario"],
                    ["▤", "Finanzas"],
                    ["◎", "Reportes"],
                  ].map(([icon, label], index) => (
                    <span key={label} className={index === 0 ? "is-active" : ""}>
                      <i aria-hidden="true">{icon}</i><b>{label}</b>
                    </span>
                  ))}
                  <div className="mockup-viernes-orb" aria-label="Viernes AI">✦</div>
                </aside>

                <div className="mockup-body">
                {/* HEADER DE LA APP */}
                <div className="mockup-app-topbar">
                  <div className="app-tenant-badge">
                    <span className="tenant-dot" />
                    <strong>Corporación Los Cedros SAC</strong>
                    <span className="tenant-branch">· Sede Principal</span>
                  </div>
                  <div className="app-module-badge">
                    <span className="module-tag">{currentProduct.shortName}</span>
                  </div>
                </div>

                {/* TÍTULO Y CONTEXTO */}
                <div className="mockup-header">
                  <div>
                    <span className="kicker-lead">ENTORNO DEMOSTRATIVO · MÓDULO EN EJECUCIÓN</span>
                    <h3 className="mockup-title">{isLeadExperience ? "PROCESA Cloud · Panel operativo" : currentProduct.visual.title}</h3>
                    <p className="mockup-subtitle">{currentProduct.visual.subtitle}</p>
                  </div>
                </div>

                <div className="mockup-module-grid" aria-label="Módulos del ecosistema">
                  {[
                    ["POS", "Punto de venta"],
                    ["INV", "Inventario"],
                    ["FIN", "Finanzas"],
                    ["AUD", "Auditoría"],
                  ].map(([code, label]) => (
                    <div key={code}>
                      <i>{code}</i><span>{label}</span>
                    </div>
                  ))}
                </div>

                {/* GRID DE KPIs */}
                <div className="mockup-metrics-grid">
                  <div className="metric-card metric-primary">
                    <span className="metric-lbl">{currentProduct.visual.metricMain.label}</span>
                    <strong className="metric-val">{currentProduct.visual.metricMain.value}</strong>
                    {currentProduct.visual.metricMain.delta && (
                      <span className="metric-delta">{currentProduct.visual.metricMain.delta}</span>
                    )}
                  </div>
                  <div className="metric-card">
                    <span className="metric-lbl">{currentProduct.visual.metricSecondary.label}</span>
                    <b className="metric-subval">{currentProduct.visual.metricSecondary.value}</b>
                  </div>
                  <div className="metric-card">
                    <span className="metric-lbl">{currentProduct.visual.metricTertiary.label}</span>
                    <b className="metric-subval">{currentProduct.visual.metricTertiary.value}</b>
                  </div>
                  <div className="metric-card metric-security">
                    <span className="metric-lbl">Contexto y acceso</span>
                    <b className="metric-subval">Empresa · Sucursal · Rol</b>
                  </div>
                </div>

                {/* SIMULADOR DE EVENTOS EN VIVO */}
                <div className="mockup-lower-grid">
                <div className="mockup-stream">
                  <div className="stream-header-row">
                    <span className="stream-title">Actividad operativa en tiempo real</span>
                    <span className="stream-live-indicator">
                      <i className="pulse-beacon" /> En vivo
                    </span>
                  </div>
                  <div className="stream-events-list">
                    {currentProduct.visual.streamItems.map((st, i) => (
                      <div key={i} className="stream-event-item">
                        <span className="stream-event-tag">{st.tag}</span>
                        <span className="stream-event-text">{st.text}</span>
                        <small className="stream-event-time">{st.time}</small>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mockup-viernes-card">
                  <span>VIERNES AI · DEMO</span>
                  <b>¿Qué necesita atención hoy?</b>
                  <p>Consulta la operación según empresa, sucursal y permisos.</p>
                  <i>Explorar asistencia →</i>
                </div>
                </div>
                </div>
              </div>

              {/* PIE DE VENTANA */}
              <div className="mockup-footer">
                <span className="footer-brand-label">PROCESA Cloud · Ecosistema Empresarial de PROCESA CORP</span>
                <a href="#soluciones" className="mockup-detail-link">
                  Explorar catálogo →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTROLES DE NAVEGACIÓN INFERIORES: FLECHAS PROTAGONISTAS + INDICADORES */}
      <div className="carousel-controls-bar">
        <button
          type="button"
          className="carousel-arrow-btn arrow-prev"
          onClick={handlePrev}
          aria-label="Producto anterior"
        >
          <span className="arrow-glyph" aria-hidden="true">←</span>
          <span className="arrow-text">Anterior</span>
        </button>

        <div className="carousel-indicators" role="group" aria-label="Indicadores de solución">
          {HERO_PRODUCT_EXPERIENCES.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={idx === currentIndex}
              className={`indicator-dot ${idx === currentIndex ? "active" : ""}`}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Ir a solución ${idx + 1}: ${p.name}`}
            />
          ))}
        </div>

        <button
          type="button"
          className="carousel-arrow-btn arrow-next"
          onClick={handleNext}
          aria-label="Producto siguiente"
        >
          <span className="arrow-text">Siguiente</span>
          <span className="arrow-glyph" aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
