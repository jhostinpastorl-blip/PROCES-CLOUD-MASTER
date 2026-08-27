"use client";

import { useState } from "react";
import { PosSubNav } from "../../components/PosSubNav";

export default function ElectronicInvoicingSettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "series" | "environment">("profile");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Facturación Electrónica (SUNAT / UBL 2.1)</h1>
        <p className="text-muted-foreground">
          Configuración fiscal, gestión de series tributarias, entorno de emisión y estado de transporte CPE.
        </p>
      </div>

      <PosSubNav activePath="/app/pos/settings/electronic-invoicing" />

      {/* Tabs */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setActiveTab("profile")}
          className={`pb-2 px-4 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "profile"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Identidad Fiscal
        </button>
        <button
          onClick={() => setActiveTab("series")}
          className={`pb-2 px-4 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "series"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Series & Correlativos
        </button>
        <button
          onClick={() => setActiveTab("environment")}
          className={`pb-2 px-4 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "environment"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Entorno & Transporte
        </button>
      </div>

      {activeTab === "profile" && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold">Datos Tributarios del Emisor</h2>
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">RUC</label>
                <input
                  type="text"
                  defaultValue="20600000001"
                  readOnly
                  className="mt-1 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">Razón Social</label>
                <input
                  type="text"
                  defaultValue="EMPRESA DEMO S.A.C."
                  readOnly
                  className="mt-1 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">Nombre Comercial</label>
                <input
                  type="text"
                  defaultValue="PROCESA STORE"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">Domicilio Fiscal</label>
                <input
                  type="text"
                  defaultValue="AV. JAVIER PRADO ESTE 1234, SAN ISIDRO"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold">Ubicación Geográfica (Ubigeo)</h2>
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">Código Ubigeo (INEI)</label>
                <input
                  type="text"
                  defaultValue="150131"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Dpto</label>
                  <input
                    type="text"
                    defaultValue="LIMA"
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Prov</label>
                  <input
                    type="text"
                    defaultValue="LIMA"
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Distrito</label>
                  <input
                    type="text"
                    defaultValue="SAN ISIDRO"
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "series" && (
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Series Fiscales Registradas</h2>
              <p className="text-xs text-muted-foreground">Control atómico de numeración correlativa por tipo de comprobante.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground font-semibold">
                  <th className="p-3">Tipo de Comprobante</th>
                  <th className="p-3">Serie</th>
                  <th className="p-3">Último Correlativo</th>
                  <th className="p-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="p-3 font-medium">Factura Electrónica (01)</td>
                  <td className="p-3 font-mono font-bold text-primary">F001</td>
                  <td className="p-3 font-mono">00000124</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600">Activo</span></td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">Boleta de Venta Electrónica (03)</td>
                  <td className="p-3 font-mono font-bold text-primary">B001</td>
                  <td className="p-3 font-mono">00000892</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600">Activo</span></td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">Nota de Crédito Factura (07)</td>
                  <td className="p-3 font-mono font-bold text-primary">FC01</td>
                  <td className="p-3 font-mono">00000015</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600">Activo</span></td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">Nota de Crédito Boleta (07)</td>
                  <td className="p-3 font-mono font-bold text-primary">BC01</td>
                  <td className="p-3 font-mono">00000042</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600">Activo</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "environment" && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold">Entorno de Emisión</h2>
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">Ambiente Activo</label>
                <div className="mt-1 flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="env" defaultChecked className="text-primary" />
                    <span>Beta / Pruebas (SUNAT Beta)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="env" disabled className="text-primary" />
                    <span className="text-muted-foreground">Producción (Bloqueado en QA)</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">Proveedor de Transporte</label>
                <select className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
                  <option value="mock">Simulador Mock / QA Local</option>
                  <option value="beta_sunat">SUNAT SEE Beta SOAP</option>
                  <option value="ose" disabled>Operador OSE (Próximamente)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold">Certificado Digital & Seguridad</h2>
            <p className="text-xs text-muted-foreground">
              Las claves privadas se almacenan aisladas y nunca se exponen al cliente.
            </p>
            <div className="p-4 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs">
              ✓ Certificado Digital QA Activo (PROCESA Cloud Software Signer)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
