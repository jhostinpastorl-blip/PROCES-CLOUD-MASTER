"use client";

import { useEffect, useState } from "react";

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

export function ThemeToggle({ className = "", showLabel = true }: { className?: string; showLabel?: boolean }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let initialTheme: Theme = "dark";
    try {
      const stored = localStorage.getItem("procesa-theme") as Theme | null;
      if (stored === "dark" || stored === "light") {
        initialTheme = stored;
      } else if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
        initialTheme = "light";
      }
    } catch {
      initialTheme = "dark";
    }

    setTheme(initialTheme);
    applyTheme(initialTheme);

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

  const isLight = theme === "light";

  return (
    <div className={`theme-switch-container ${className}`}>
      {showLabel && <span className="theme-switch-caption">Apariencia</span>}
      <button
        type="button"
        role="switch"
        aria-checked={isLight}
        aria-label={isLight ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
        className={`luxury-theme-switch ${isLight ? "state-on" : "state-off"}`}
        onClick={toggle}
        title={isLight ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
      >
        <span className="switch-track">
          <span className="switch-icon switch-icon-sun" aria-hidden="true">☀</span>
          <span className="switch-icon switch-icon-moon" aria-hidden="true">◐</span>
          <span className="switch-knob" />
        </span>
      </button>
    </div>
  );
}
