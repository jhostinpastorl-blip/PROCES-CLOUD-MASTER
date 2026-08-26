import { getCompanyContexts } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { updateUserProfile } from "./actions";
import { StatusChip } from "@/components/ui/status-chip";

export default async function Settings() {
  const companies = await getCompanyContexts();
  const s = await createClient();
  const {
    data: { user },
  } = await s.auth.getUser();

  let profileName = "";
  if (user) {
    const { data: profile } = await s
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    profileName = profile?.full_name || user.user_metadata?.full_name || "";
  }

  return (
    <main className="app-content premium-real">
      <div className="premium-page-head real-head">
        <div>
          <span>PREFERENCIAS</span>
          <h2>Configuración y Perfil</h2>
          <p>Ajustes operativos del espacio de trabajo y perfil de usuario.</p>
        </div>
      </div>

      <div className="settings-layout real-settings">
        <aside>
          <button className="active">General</button>
          <button>Perfil</button>
          <button>Notificaciones</button>
          <button>Seguridad</button>
        </aside>

        <section className="settings-card">
          <div className="settings-block">
            <h3>Perfil de usuario</h3>
            <p>Información personal del operador activo.</p>
            <form action={updateUserProfile} className="form-grid">
              <label>
                <span>Correo registrado</span>
                <input value={user?.email || ""} disabled style={{ opacity: 0.7 }} />
              </label>
              <label>
                <span>Nombre completo</span>
                <input
                  name="fullName"
                  defaultValue={profileName}
                  placeholder="Tu nombre completo"
                  required
                />
              </label>
              <div>
                <button className="primary-btn" style={{ marginTop: "1.75rem" }}>
                  Actualizar perfil
                </button>
              </div>
            </form>
          </div>

          <div className="settings-block">
            <h3>Contexto empresarial</h3>
            <p>Empresas disponibles y acceso actual.</p>
            <div className="settings-company-list">
              {companies.map((c) => (
                <div key={c.companyId}>
                  <span className="company-avatar">
                    {c.companyName.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <b>{c.companyName}</b>
                    <small>{c.roleCodes.join(", ") || "Sin rol"}</small>
                  </div>
                  <StatusChip tone="success">Activa</StatusChip>
                </div>
              ))}
            </div>
          </div>

          <div className="settings-block">
            <h3>Preferencias generales</h3>
            <div className="form-grid">
              <label>
                <span>Idioma</span>
                <select defaultValue="es">
                  <option value="es">Español</option>
                </select>
              </label>
              <label>
                <span>Formato de fecha</span>
                <select defaultValue="dmy">
                  <option value="dmy">DD/MM/YYYY</option>
                </select>
              </label>
              <label>
                <span>Moneda visual</span>
                <select defaultValue="PEN">
                  <option>PEN</option>
                  <option>USD</option>
                </select>
              </label>
              <label>
                <span>Zona horaria</span>
                <select defaultValue="America/Lima">
                  <option>America/Lima</option>
                </select>
              </label>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
