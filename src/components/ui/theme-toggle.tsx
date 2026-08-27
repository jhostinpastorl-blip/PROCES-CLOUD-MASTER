"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Theme = "light" | "dark";

function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = t;
  document.documentElement.style.colorScheme = t;
  try {
    localStorage.setItem("procesa-theme", t);
  } catch {
    // Ignore in restricted storage environments
  }
  window.dispatchEvent(new CustomEvent("procesa:theme-change", { detail: { theme: t } }));
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let currentTheme: Theme = "light";
    try {
      const stored = localStorage.getItem("procesa-theme") as Theme | null;
      if (stored === "dark" || stored === "light") {
        currentTheme = stored;
      } else if (document.documentElement.dataset.theme === "dark") {
        currentTheme = "dark";
      }
    } catch {
      // default light
    }

    setTheme(currentTheme);
    applyTheme(currentTheme);

    const onThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ theme: Theme }>;
      if (customEvent.detail?.theme) {
        setTheme(customEvent.detail.theme);
      }
    };

    window.addEventListener("procesa:theme-change", onThemeChange);
    return () => {
      window.removeEventListener("procesa:theme-change", onThemeChange);
    };
  }, []);

  const toggle = () => {
    const nextTheme: Theme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  // Semantics:
  // ON  -> LIGHT MODE -> fondo claro -> Logo Navy (/brand/logo-on.png) -> Label "Luz (ON)"
  // OFF -> DARK MODE  -> fondo navy  -> Logo Amarillo (/brand/logo-off.png) -> Label "Noche (OFF)"
  const isLight = theme === "light";

  return (
    <button
      type="button"
      className={`theme-switch ${theme} ${className}`}
      onClick={toggle}
      aria-label={isLight ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
      aria-pressed={!isLight}
      title={isLight ? "Modo Luz (ON) activo — Clic para modo Noche (OFF)" : "Modo Noche (OFF) activo — Clic para modo Luz (ON)"}
    >
      <span className="theme-track">
        <Image
          src={isLight ? "/brand/logo-on.png" : "/brand/logo-off.png"}
          width={18}
          height={21}
          alt=""
          aria-hidden="true"
          priority
        />
      </span>
      <span className="theme-label">{isLight ? "Luz (ON)" : "Noche (OFF)"}</span>
    </button>
  );
}