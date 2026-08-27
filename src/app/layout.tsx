import{ThemeInit}from"@/components/ui/theme-init";
import "./globals.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "PROCESA Cloud | El futuro se procesa hoy.",
  description: "Plataforma SaaS empresarial modular.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ThemeInit />
        <a className="skip-link" href="#main-content">
          Saltar al contenido
        </a>
        <div id="main-content">{children}</div>
      </body>
    </html>
  );
}