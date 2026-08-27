import { requestDemo } from "./actions";
import { AuthShell } from "@/components/ui/auth-shell";
import { PremiumField } from "@/components/ui/premium-field";

export default async function Demo({
  searchParams,
}: {
  searchParams?: Promise<{ sent?: string; error?: string }>;
}) {
  const sp = (await searchParams) || {};
  const isSent = sp.sent === "1";
  const hasError = !!sp.error;

  return (
    <AuthShell
      kicker="SOLICITUD DE DEMO"
      title="Conoce PROCESA Cloud"
      subtitle="Cuéntanos sobre tu empresa. Te ayudaremos a diseñar la arquitectura modular que tu negocio necesita."
    >
      {isSent ? (
        <div className="demo-success-box">
          <div className="demo-success-icon">✓</div>
          <h3>¡Solicitud recibida con éxito!</h3>
          <p>
            Un especialista de PROCESA Cloud se pondrá en contacto contigo a la brevedad para coordinar la demostración
            personalizada.
          </p>
        </div>
      ) : (
        <form action={requestDemo} className="premium-form">
          {hasError && (
            <div className="demo-error-banner">
              Ocurrió un error al procesar tu solicitud. Por favor, verifica los campos e inténtalo nuevamente.
            </div>
          )}

          {/* Honeypot */}
          <input name="website" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />

          <PremiumField
            label="Nombre y apellido"
            name="name"
            placeholder="Ej. Carlos Mendoza"
            required
          />

          <PremiumField
            label="Empresa / Razón Social"
            name="company"
            placeholder="Ej. Inversiones & Servicios SAC"
            required
          />

          <PremiumField
            label="Correo corporativo"
            name="email"
            type="email"
            placeholder="carlos@tuempresa.com"
            autoComplete="email"
            required
          />

          <div className="premium-field">
            <span>Módulos de mayor interés</span>
            <select name="modules" className="premium-select" required defaultValue="POS">
              <option value="POS">POS — Punto de Venta & Caja</option>
              <option value="REST">REST — Operación Gastronómica</option>
              <option value="POS + REST">POS + REST — Retail & Alimentos</option>
              <option value="CONTA">CONTA — Finanzas & Contabilidad</option>
              <option value="FLOW">FLOW — Procesos & Workflows</option>
              <option value="ALL">Suite Completa — Todos los módulos</option>
            </select>
          </div>

          <div className="premium-field">
            <span>¿Qué desafío u objetivo necesitas resolver? (Opcional)</span>
            <textarea
              name="message"
              className="premium-textarea"
              placeholder="Describe brevemente tus operaciones actuales, número de sucursales o requerimientos particulares..."
              rows={3}
            />
          </div>

          <button className="premium-submit" type="submit">
            Solicitar demostración guiada <span>→</span>
          </button>
        </form>
      )}
    </AuthShell>
  );
}