import Link from "next/link";
import { ProcesaLogo } from "./procesa-logo";
import { ThemeToggle } from "./theme-toggle";

interface AuthShellProps {
  children: React.ReactNode;
  kicker: string;
  title: string;
  subtitle: string;
}

export function AuthShell({ children, kicker, title, subtitle }: AuthShellProps) {
  return (
    <main className="auth-premium">
      {/* Left panel: Permanently dark navy with Yellow Official Logo */}
      <section className="auth-brand-panel">
        <div>
          <ProcesaLogo variant="dark" />
          <div className="auth-brand-copy">
            <span>PROCESA CLOUD</span>
            <h1>
              Tu empresa procesándose
              <br />
              en tiempo real.
            </h1>
            <p>
              Una plataforma modular para operar, controlar y hacer crecer tu negocio con la tecnología de PROCESA CORP.{" "}
              <em>El futuro se procesa hoy.</em>
            </p>
          </div>
        </div>
        <div className="auth-proof">
          <div>
            <b>10+</b>
            <span>Módulos conectados</span>
          </div>
          <div>
            <b>24/7</b>
            <span>Acceso a tu operación</span>
          </div>
          <div>
            <b>1</b>
            <span>Plataforma empresarial</span>
          </div>
        </div>
      </section>

      {/* Right panel: Adaptive surface with ThemeToggle */}
      <section className="auth-form-panel">
        <div className="auth-top-bar">
          <Link href="/" className="auth-back">
            ← Volver a PROCESA Cloud
          </Link>
          <ThemeToggle />
        </div>
        <div className="auth-form-wrap">
          <span className="section-kicker">{kicker}</span>
          <h2>{title}</h2>
          <p className="auth-subtitle">{subtitle}</p>
          {children}
          <div className="auth-secure">▣ Conexión segura · PROCESA CORP · El futuro se procesa hoy.</div>
        </div>
      </section>
    </main>
  );
}