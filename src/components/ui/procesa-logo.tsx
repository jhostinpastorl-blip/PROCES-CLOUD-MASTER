import Image from "next/image";
import type { CSSProperties } from "react";

interface ProcesaLogoProps {
  compact?: boolean;
  variant?: "auto" | "light" | "dark";
  className?: string;
  width?: number;
  height?: number;
}

export function ProcesaLogo({
  compact = false,
  variant = "auto",
  className = "",
  width = 36,
  height = 42,
}: ProcesaLogoProps) {
  // Official Brand Rule:
  // LIGHT / ON / FONDO CLARO -> LOGO AZUL MARINO (/brand/logo-on.png)
  // DARK / OFF / FONDO NAVY  -> LOGO AMARILLO (/brand/logo-off.png)

  if (variant === "dark") {
    // Explicitly for permanently dark surfaces (sidebars, auth brand panel)
    return (
      <div className={`brand-lockup brand-lockup-dark ${className}`}>
        <span className="brand-art">
          <Image
            src="/brand/logo-off.png"
            width={width}
            height={height}
            alt="PROCESA Cloud"
            priority
          />
        </span>
        {!compact && (
          <span className="brand-text">
            <b>PROCESA</b>
            <small>CLOUD</small>
          </span>
        )}
      </div>
    );
  }

  if (variant === "light") {
    // Explicitly for permanently light surfaces
    return (
      <div className={`brand-lockup brand-lockup-light ${className}`}>
        <span className="brand-art">
          <Image
            src="/brand/logo-on.png"
            width={width}
            height={height}
            alt="PROCESA Cloud"
            priority
          />
        </span>
        {!compact && (
          <span className="brand-text">
            <b>PROCESA</b>
            <small>CLOUD</small>
          </span>
        )}
      </div>
    );
  }

  // Auto variant: a single official asset slot is switched by data-theme.
  // This avoids rendering both brand marks at once and prevents ghosting.
  return (
    <div className={`brand-lockup brand-lockup-auto ${className}`}>
      <span
        className="brand-art brand-art-auto"
        style={{
          "--brand-logo-width": `${width}px`,
          "--brand-logo-height": `${height}px`,
        } as CSSProperties}
      >
        <span className="brand-logo-asset" role="img" aria-label="PROCESA Cloud" />
      </span>
      {!compact && (
        <span className="brand-text">
          <b>PROCESA</b>
          <small>CLOUD</small>
        </span>
      )}
    </div>
  );
}
