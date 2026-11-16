import { ChevronLeft } from "lucide-react";

import { Badge, DetailScreen, SeccionTarjeta } from "@opai/ds";
import { formatearClp } from "@opai/domain";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { fecha } from "@/lib/fechas";

import { BotonPdf } from "./boton-pdf";
import { estadoCotizacion } from "./lista-cotizaciones";
import type { DetalleCotizacion } from "./tipos";

const clp = (n: number | null) => (n === null ? "—" : formatearClp(n));
const cobertura = (p: DetalleCotizacion["secciones"][number]["puestos"][number]) =>
  [p.patron, p.horaInicio && p.horaFin ? `${p.horaInicio}–${p.horaFin}` : null, p.diasCobertura ? `${p.diasCobertura} días` : null]
    .filter(Boolean)
    .join(" · ");

/** Detalle de cotización en portal cliente (patrón DetailScreen, CAR-589). */
export function DetalleDeCotizacion({ c }: { c: DetalleCotizacion }) {
  const estado = estadoCotizacion(c);
  return (
    <div className="flex flex-col gap-4">
      <EnlaceBoton href="/cliente/cotizaciones" variante="secondary" icono={ChevronLeft} className="w-fit">
        Cotizaciones
      </EnlaceBoton>
      <DetailScreen
        state="ready"
        titulo={c.titulo}
        estado={<Badge tono={estado.tono}>{estado.etiqueta}</Badge>}
        acciones={
          <div className="flex flex-wrap gap-2">
            {c.documentos.map((d) => (
              <BotonPdf
                key={d.tipo}
                cotizacionId={c.cotizacionId}
                tipo={d.tipo}
                etiqueta={d.tipo === "cotizacion" ? "Descargar cotización (PDF)" : "Descargar propuesta técnica (PDF)"}
              />
            ))}
          </div>
        }
        accionesDebajoEnTelefono
      >
        <dl className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Número", c.codigo],
            ["Fecha de envío", c.enviadaEn ? fecha(c.enviadaEn) : "—"],
            ["Válida hasta", c.validaHasta ? fecha(c.validaHasta) : "—"],
            ["Versión", String(c.versionNumero)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="t-caption">{k}</dt>
              <dd className="t-body-sm t-numeric font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        {c.secciones.map((s) => (
          <SeccionTarjeta key={s.nombre} titulo={s.nombre} sinRelleno>
            <ul className="flex flex-col divide-y divide-border">
              {s.puestos.map((p) => (
                <li key={p.nombre} className="flex flex-wrap justify-between gap-x-3 px-4 py-2">
                  <span className="t-body-sm font-medium">{p.nombre}</span>
                  <span className="t-caption t-numeric">
                    {p.posiciones} {p.posiciones === 1 ? "puesto" : "puestos"}
                    {cobertura(p) ? ` · ${cobertura(p)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </SeccionTarjeta>
        ))}
        <SeccionTarjeta titulo="Totales mensuales">
          <dl className="flex flex-col gap-1">
            <div className="flex justify-between">
              <dt className="t-body-sm text-fg-muted">Neto mensual</dt>
              <dd className="t-body-sm t-numeric">{clp(c.netoMensualClp)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="t-body-sm text-fg-muted">IVA</dt>
              <dd className="t-body-sm t-numeric">{clp(c.ivaClp)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="t-label">Total mensual</dt>
              <dd className="t-subheading t-numeric">{clp(c.totalMensualClp)}</dd>
            </div>
          </dl>
        </SeccionTarjeta>
        <p className="t-caption">Tu acceso completo se activa cuando aceptes el servicio.</p>
      </DetailScreen>
    </div>
  );
}