"use client";

import React, { useState } from "react";

export function HeroLiveEngine() {
  const [activeTab, setActiveTab] = useState<"telemetry" | "modules" | "viernes" | "security">("telemetry");
  const [viernesQuery, setViernesQuery] = useState<string>("¿Cuánto vendimos hoy en la sucursal Principal?");

  const queries = [
    {
      q: "¿Cuánto vendimos hoy en la sucursal Principal?",
      ans: "Sede Principal: S/ 14,820.00 en 184 transacciones. Incremento de +12.4% frente a ayer. (Validado según rol y sede activa).",
    },
    {
      q: "¿Qué productos tienen stock crítico en almacén?",
      ans: "Inventario: 3 productos por debajo del punto de reorden en Almacén Central. Notificación emitida al Supervisor.",
    },
    {
      q: "¿Hay mesas pendientes de facturar en REST?",
      ans: "Módulo REST: 6 mesas abiertas, 2 en comanda y 1 en cierre de caja. Total preliminar: S/ 1,480.00.",
    },
  ];

  return (
    <div className="hero-engine-card">
      <div className="engine-chrome">
        <div className="chrome-dots">
          <span className="dot dot-red" />
          <span className="dot dot-yellow" />
          <span className="dot dot-green" />
        </div>
        <div className="chrome-address">
          <span className="lock-icon">🔒</span>
          <span>cloud.procesacorp.com/core</span>
        </div>
        <div className="chrome-status">
          <span className="pulse-dot" />
          <span className="status-text">SIMULACIÓN INTERACTIVA</span>
        </div>
      </div>

      <div className="engine-nav">
        <button
          type="button"
          className={`engine-tab ${activeTab === "telemetry" ? "active" : ""}`}
          onClick={() => setActiveTab("telemetry")}
        >
          <span>📊</span> Telemetría Core
        </button>
        <button
          type="button"
          className={`engine-tab ${activeTab === "modules" ? "active" : ""}`}
          onClick={() => setActiveTab("modules")}
        >
          <span>🧩</span> Módulos en Tiempo Real
        </button>
        <button
          type="button"
          className={`engine-tab ${activeTab === "viernes" ? "active" : ""}`}
          onClick={() => setActiveTab("viernes")}
        >
          <span>✦</span> Viernes AI
        </button>
        <button
          type="button"
          className={`engine-tab ${activeTab === "security" ? "active" : ""}`}
          onClick={() => setActiveTab("security")}
        >
          <span>🛡️</span> Aislamiento RLS
        </button>
      </div>

      <div className="engine-viewport">
        {/* TAB 1: TELEMETRIA */}
        {activeTab === "telemetry" && (
          <div className="engine-pane pane-telemetry">
            <div className="pane-header">
              <div>
                <span className="kicker-mini">DATOS DEMOSTRATIVOS · ENTORNO DE SIMULACIÓN</span>
                <h4>Grupo Andino SAC · Sede Principal</h4>
              </div>
              <span className="badge-live">Simulación · Telemetría demo</span>
            </div>

            <div className="telemetry-grid">
              <div className="metric-box">
                <span className="metric-label">Operaciones procesadas</span>
                <strong className="metric-val">1,248</strong>
                <span className="metric-delta delta-up">↑ +18.2% esta semana</span>
              </div>
              <div className="metric-box">
                <span className="metric-label">Sucursales conectadas</span>
                <strong className="metric-val">04 / 04</strong>
                <span className="metric-sub">Lima, Arequipa, Cusco, Trujillo</span>
              </div>
              <div className="metric-box">
                <span className="metric-label">Seguridad & RLS</span>
                <strong className="metric-val">100%</strong>
                <span className="metric-sub">0 brechas · Auditoría inmutable</span>
              </div>
            </div>

            <div className="live-stream-box">
              <div className="stream-head">
                <span>Simulación de eventos de negocio en tiempo real</span>
                <span className="stream-time">Último segundo</span>
              </div>
              <div className="stream-list">
                <div className="stream-row">
                  <span className="stream-tag tag-pos">POS</span>
                  <span className="stream-text">Venta completada #B001-00249 · Sede Principal</span>
                  <span className="stream-meta">hace 3s</span>
                </div>
                <div className="stream-row">
                  <span className="stream-tag tag-auth">AUTH</span>
                  <span className="stream-text">Contexto verificado · Gerente Operaciones</span>
                  <span className="stream-meta">hace 8s</span>
                </div>
                <div className="stream-row">
                  <span className="stream-tag tag-audit">AUDIT</span>
                  <span className="stream-text">Acción sensible registrada en log inmutable</span>
                  <span className="stream-meta">hace 14s</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MODULOS */}
        {activeTab === "modules" && (
          <div className="engine-pane pane-modules">
            <div className="pane-header">
              <div>
                <span className="kicker-mini">CONEXIÓN DEL ECOSISTEMA</span>
                <h4>Hub Central & Satélites de Negocio</h4>
              </div>
              <span className="badge-live">Modularidad pura</span>
            </div>

            <div className="constellation-grid">
              <div className="constellation-card core-hub">
                <span className="hub-tag">NÚCLEO CENTRAL</span>
                <h5>PROCESA Cloud Core</h5>
                <p>Empresa · Sucursales · Usuarios · Roles · Permisos · RLS</p>
                <div className="hub-status">Base transversal activa</div>
              </div>

              <div className="satellites-container">
                <div className="satellite-item sat-pos">
                  <div className="sat-header">
                    <b>POS</b>
                    <span className="sat-state ready">Fase 1</span>
                  </div>
                  <span>Punto de Venta & Caja</span>
                </div>
                <div className="satellite-item sat-rest">
                  <div className="sat-header">
                    <b>REST</b>
                    <span className="sat-state roadmap">Fase 2</span>
                  </div>
                  <span>Restaurantes & Mesas</span>
                </div>
                <div className="satellite-item sat-conta">
                  <div className="sat-header">
                    <b>CONTA</b>
                    <span className="sat-state roadmap">Fase 3</span>
                  </div>
                  <span>Finanzas Integradas</span>
                </div>
                <div className="satellite-item sat-flow">
                  <div className="sat-header">
                    <b>FLOW</b>
                    <span className="sat-state roadmap">Fase 4</span>
                  </div>
                  <span>Automatización de Procesos</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: VIERNES */}
        {activeTab === "viernes" && (
          <div className="engine-pane pane-viernes">
            <div className="pane-header">
              <div>
                <span className="kicker-mini">CAPA DE INTELIGENCIA DE NEGOCIO</span>
                <h4>Viernes · Asistente Transversal Seguro</h4>
              </div>
              <span className="badge-live">Demostración conceptual</span>
            </div>

            <div className="viernes-interactive">
              <div className="viernes-prompts-bar">
                {queries.map((item) => (
                  <button
                    key={item.q}
                    type="button"
                    className={`viernes-chip ${viernesQuery === item.q ? "selected" : ""}`}
                    onClick={() => setViernesQuery(item.q)}
                  >
                    {item.q}
                  </button>
                ))}
              </div>

              <div className="viernes-chat-bubble">
                <div className="bubble-user">
                  <span className="bubble-avatar">👤</span>
                  <div className="bubble-body">
                    <strong>Pregunta de negocio (simulada):</strong>
                    <p>{viernesQuery}</p>
                  </div>
                </div>

                <div className="bubble-bot">
                  <span className="bubble-avatar bot-avatar">✦</span>
                  <div className="bubble-body">
                    <strong>Respuesta conceptual de Viernes (filtrada con RLS):</strong>
                    <p>
                      {queries.find((x) => x.q === viernesQuery)?.ans}
                    </p>
                    <small className="bubble-note">
                      🔒 Demostración conceptual: las consultas de Viernes se procesarán en Fase 0 validando RLS, sede activa y rol del usuario.
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SEGURIDAD */}
        {activeTab === "security" && (
          <div className="engine-pane pane-security">
            <div className="pane-header">
              <div>
                <span className="kicker-mini">AISLAMIENTO CRÍTICO</span>
                <h4>Multi-Tenancy y Barreras Criptográficas</h4>
              </div>
              <span className="badge-live">PostgreSQL RLS Activo</span>
            </div>

            <div className="security-demo-grid">
              <div className="tenant-card tenant-a">
                <div className="tenant-head">
                  <span className="tenant-badge">TENANT A</span>
                  <strong>Grupo Andino SAC</strong>
                </div>
                <ul>
                  <li>✓ Datos confinados estrictamente a company_id = A</li>
                  <li>✓ Solo miembros con rol activo tienen lectura</li>
                  <li>✓ 0 visibilidad de otras empresas</li>
                </ul>
              </div>

              <div className="tenant-barrier">
                <span className="barrier-shield">🛡️</span>
                <span className="barrier-text">RLS & SECURITY DEFINER</span>
                <small>Búsqueda search_path blindada</small>
              </div>

              <div className="tenant-card tenant-b">
                <div className="tenant-head">
                  <span className="tenant-badge">TENANT B</span>
                  <strong>Restaurante Central</strong>
                </div>
                <ul>
                  <li>✓ Datos confinados estrictamente a company_id = B</li>
                  <li>✓ Aislamiento de ventas, stock y clientes</li>
                  <li>✓ Base de datos compartida, datos herméticos</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="engine-footer">
        <div className="footer-meta">
          <span>Simulación interactiva de capacidades</span>
          <span>·</span>
          <span>Arquitectura Enterprise SaaS PROCESA CORP</span>
        </div>
        <div className="footer-action">
          <a href="/design-preview/dashboard" className="preview-link">
            Explorar dashboard completo →
          </a>
        </div>
      </div>
    </div>
  );
}
