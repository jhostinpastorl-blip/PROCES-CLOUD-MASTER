import Link from "next/link";
import { ProcesaLogo } from "@/components/ui/procesa-logo";

const activity = [
  ["Venta completada", "Ticket B001-00428", "S/ 148.50", "Hace 2 min"],
  ["Stock actualizado", "Coca Cola 500 ml", "36 unidades", "Hace 5 min"],
  ["Pago recibido", "Caja Principal", "Yape", "Hace 8 min"],
];

export function FocusedProductHero() {
  return (
    <div className="focused-hero">
      <div className="focused-hero-copy">
        <div className="focused-brand"><ProcesaLogo compact /><span>ECOSISTEMA EMPRESARIAL MODULAR</span></div>
        <h1>Tu operación,<br /><em>en un solo lugar.</em></h1>
        <p>
          Centraliza ventas, caja e inventario por empresa y sucursal. Empieza con POS
          y activa nuevas capacidades cuando tu negocio las necesite.
        </p>
        <div className="focused-actions">
          <Link href="/registro" className="pc-btn pc-btn-primary pc-btn-lg">Comenzar gratis <span>→</span></Link>
          <Link href="/demo" className="pc-btn pc-btn-secondary pc-btn-lg">Solicitar demo</Link>
        </div>
        <small className="focused-proof">Multiempresa · Multisucursal · Roles y permisos · Auditoría</small>
      </div>

      <div className="focused-product" aria-label="Vista demostrativa del panel de PROCESA POS">
        <div className="focused-product-top">
          <div><span>PROCESA POS</span><b>Operación de hoy</b></div>
          <span className="focused-live"><i /> En línea</span>
        </div>
        <div className="focused-product-context">
          <div><small>Empresa</small><b>Andino SAC</b></div>
          <div><small>Sucursal</small><b>Sede Principal</b></div>
          <button type="button" aria-label="Cambiar contexto">⌄</button>
        </div>
        <div className="focused-kpis">
          <article><small>Ventas del día</small><strong>S/ 8,420.60</strong><span>↑ 12.4% vs. ayer</span></article>
          <article><small>Caja actual</small><strong>S/ 2,184.50</strong><span>Turno abierto · 08:02</span></article>
          <article className="focused-kpi-alert"><small>Stock crítico</small><strong>4 productos</strong><span>Requieren atención</span></article>
        </div>
        <div className="focused-activity">
          <div className="focused-activity-head"><b>Actividad reciente</b><span>Actualizado ahora</span></div>
          {activity.map(([title, detail, value, time]) => (
            <div className="focused-activity-row" key={title + detail}>
              <i aria-hidden="true" />
              <div><b>{title}</b><small>{detail}</small></div>
              <strong>{value}</strong><time>{time}</time>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
