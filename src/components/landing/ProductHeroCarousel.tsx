"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { HERO_PRODUCT_EXPERIENCES, ProductExperience } from "@/config/product-experiences";

export function ProductHeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const currentProduct: ProductExperience = HERO_PRODUCT_EXPERIENCES[currentIndex];

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? HERO_PRODUCT_EXPERIENCES.length - 1 : prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === HERO_PRODUCT_EXPERIENCES.length - 1 ? 0 : prev + 1));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev]);

  return (
    <div
      className="hero-carousel-wrapper"
      style={
        {
          "--product-accent": currentProduct.accentColor,
          "--product-glow": currentProduct.accentGlow,
          "--product-badge": currentProduct.accentBadge,
        } as React.CSSProperties
      }
      aria-roledescription="carrusel de productos"
      aria-label="Ecosistema de Soluciones PROCESA Cloud"
    >
      {/* NAVEGACIÓN SUPERIOR DE PRODUCTOS (CHIPS ACTIVOS) */}
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
              <i className="sector-icon">◆</i> {currentProduct.sector}
            </span>
            <span className={`status-pill tone-${currentProduct.statusTone}`}>
              {currentProduct.statusLabel}
            </span>
          </div>

          <h1 className="hero-heading">
            <span className="heading-brand-lead">{currentProduct.name}</span>
            <br />
            {currentProduct.headline}{" "}
            <em className="heading-emphasis">{currentProduct.headlineEmphasis}</em>
          </h1>

          <p className="hero-desc">{currentProduct.description}</p>

          <div className="hero-feature-tags" aria-label="Capacidades principales">
            {currentProduct.features.map((feat) => (
              <span key={feat} className="feature-tag-chip">
                <span className="check-mark">✓</span> {feat}
              </span>
            ))}
          </div>

          <div className="hero-actions-row">
            <Link className="pc-btn pc-btn-primary pc-btn-lg hero-cta-btn" href={currentProduct.primaryCta.href}>
              {currentProduct.primaryCta.label} →
            </Link>
            <Link className="pc-btn pc-btn-secondary pc-btn-lg" href={currentProduct.secondaryCta.href}>
              {currentProduct.secondaryCta.label}
            </Link>
          </div>

          <div className="trust-pills-row">
            <span>✓ Multiempresa nativo</span>
            <span>✓ Multisucursal</span>
            <span>✓ Información aislada y protegida</span>
          </div>
        </div>

        {/* COLUMNA DERECHA: PANEL CONCEPTUAL INTERACTIVO */}
        <div className="hero-slide-visual">
          <div className="mockup-frame">
            <div className="mockup-chrome">
              <div className="chrome-controls">
                <span className="dot dot-red" />
                <span className="dot dot-yellow" />
                <span className="dot dot-green" />
              </div>
              <div className="chrome-url">
                <span className="lock-icon">🔒</span>
                <span>procesacloud.com/{currentProduct.id}</span>
              </div>
              <span className="chrome-badge-interactive">{currentProduct.visual.badgeText}</span>
            </div>

            <div className="mockup-body">
              <div className="mockup-header">
                <div>
                  <span className="kicker-lead">ENTORNO DEMOSTRATIVO CONCEPTUAL</span>
                  <h3 className="mockup-title">{currentProduct.visual.title}</h3>
                  <p className="mockup-subtitle">{currentProduct.visual.subtitle}</p>
                </div>
                <div className="product-brand-chip">
                  <span>{currentProduct.shortName}</span>
                </div>
              </div>

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
              </div>

              <div className="mockup-stream">
                <div className="stream-header-row">
                  <span>Simulación de eventos de negocio</span>
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
            </div>

            <div className="mockup-footer">
              <span>PROCESA Cloud · Ecosistema Empresarial de PROCESA CORP</span>
              <a href="#modulos" className="mockup-detail-link">
                Ver arquitectura del módulo →
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* CONTROLES DE NAVEGACIÓN INFERIORES Y FLECHAS */}
      <div className="carousel-controls-bar">
        <button
          type="button"
          className="carousel-arrow-btn arrow-prev"
          onClick={handlePrev}
          aria-label="Producto anterior"
        >
          <span aria-hidden="true">←</span>
          <span className="arrow-text">Anterior</span>
        </button>

        <div className="carousel-indicators" role="tablist" aria-label="Indicadores de diapositiva">
          {HERO_PRODUCT_EXPERIENCES.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={idx === currentIndex}
              className={`indicator-dot ${idx === currentIndex ? "active" : ""}`}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Ir a slide ${idx + 1}: ${p.name}`}
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
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
