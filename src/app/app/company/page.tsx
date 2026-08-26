import Link from "next/link";
import { getCompanyContexts } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { updateCompany } from "./actions";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusChip } from "@/components/ui/status-chip";

export default async function Company() {
  const companies = await getCompanyContexts();
  const s = await createClient();

  return (
    <main className="app-content premium-real">
      <div className="premium-page-head real-head">
        <div>
          <span>ORGANIZACIÓN</span>
          <h2>Configuración de empresas</h2>
          <p>Espacios empresariales y parámetros operativos de cada tenant.</p>
        </div>
      </div>

      {companies.length ? (
        <div className="real-company-grid">
          {await Promise.all(
            companies.map(async (c) => {
              const { data: comp } = await s
                .from("companies")
                .select("id, name, legal_name, tax_id, trade_name, timezone, currency, status")
                .eq("id", c.companyId)
                .single();

              const canUpdate = c.permissions.includes("company.update");

              return (
                <article className="real-company-card" key={c.companyId}>
                  <div className="real-company-card-head">
                    <span className="company-avatar large">
                      {c.companyName.slice(0, 2).toUpperCase()}
                    </span>
                    <StatusChip tone="success">Activa</StatusChip>
                  </div>
                  <h3>{c.companyName}</h3>
                  <p>{c.roleCodes.length ? c.roleCodes.join(" · ") : "Sin rol asignado"}</p>

                  <div className="real-company-meta">
                    <div>
                      <span>Razón Social</span>
                      <b>{comp?.legal_name || "No especificada"}</b>
                    </div>
                    <div>
                      <span>RUC / Tax ID</span>
                      <b>{comp?.tax_id || "No registrado"}</b>
                    </div>
                    <div>
                      <span>Moneda</span>
                      <b>{comp?.currency || "PEN"}</b>
                    </div>
                    <div>
                      <span>Zona horaria</span>
                      <b>{comp?.timezone || "America/Lima"}</b>
                    </div>
                  </div>

                  {canUpdate && (
                    <section className="inline-create-card" style={{ marginTop: "1rem" }}>
                      <div>
                        <span>DATOS EMPRESARIALES</span>
                        <h3>Editar configuración</h3>
                      </div>
                      <form action={updateCompany}>
                        <input type="hidden" name="companyId" value={c.companyId} />
                        <label>
                          <span>Nombre comercial</span>
                          <input name="name" defaultValue={comp?.name || c.companyName} required />
                        </label>
                        <label>
                          <span>Razón social</span>
                          <input name="legalName" defaultValue={comp?.legal_name || ""} required />
                        </label>
                        <label>
                          <span>RUC / Identificador fiscal</span>
                          <input name="taxId" defaultValue={comp?.tax_id || ""} />
                        </label>
                        <label>
                          <span>Nombre de fantasía / Marca</span>
                          <input name="tradeName" defaultValue={comp?.trade_name || ""} />
                        </label>
                        <label>
                          <span>Moneda</span>
                          <select name="currency" defaultValue={comp?.currency || "PEN"}>
                            <option value="PEN">PEN - Soles</option>
                            <option value="USD">USD - Dólares</option>
                          </select>
                        </label>
                        <label>
                          <span>Zona horaria</span>
                          <select name="timezone" defaultValue={comp?.timezone || "America/Lima"}>
                            <option value="America/Lima">America/Lima (UTC-5)</option>
                          </select>
                        </label>
                        <button className="primary-btn">Guardar cambios</button>
                      </form>
                    </section>
                  )}

                  <footer style={{ marginTop: "1.25rem" }}>
                    <Link className="secondary-btn" href={`/app/context?company=${c.companyId}`}>
                      Seleccionar
                    </Link>
                    <Link className="primary-btn" href={`/app/dashboard?company=${c.companyId}`}>
                      Entrar →
                    </Link>
                  </footer>
                </article>
              );
            })
          )}
        </div>
      ) : (
        <section className="table-card">
          <EmptyState
            title="No tienes empresas disponibles"
            text="Cuando pertenezcas a una empresa activa, aparecerá aquí."
          />
        </section>
      )}
    </main>
  );
}
