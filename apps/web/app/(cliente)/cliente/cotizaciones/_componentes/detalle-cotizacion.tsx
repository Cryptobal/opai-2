import { ChevronLeft } from "lucide-react";

import { Badge, Card, CardContent, CardHeader, CardTitle } from "@opai/ds";
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

/** Detalle de una cotización enviada (08): datos, puestos del servicio, totales y descarga de los PDF. */
export function DetalleDeCotizacion({ c }: { c: DetalleCotizacion }) {
  const estado = estadoCotizacion(c);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <EnlaceBoton href="/cliente/cotizaciones" variante="secondary" icono={ChevronLeft}>
          Cotizaciones
        </EnlaceBoton>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="t-title">{c.titulo}</h2>
        <Badge tono={estado.tono}>{estado.etiqueta}</Badge>
      </div>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
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
        <Card key={s.nombre}>
          <CardHeader>
            <CardTitle>{s.nombre}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-border">
              {s.puestos.map((p) => (
                <li key={p.nombre} className="flex flex-wrap justify-between gap-x-3 py-2">
                  <span className="t-body-sm font-medium">{p.nombre}</span>
                  <span className="t-caption t-numeric">
                    {p.posiciones} {p.posiciones === 1 ? "puesto" : "puestos"}
                    {cobertura(p) ? ` · ${cobertura(p)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
      <Card>
        <CardContent>
          <dl className="flex flex-col gap-1 pt-4">
            <div className="flex justify-between"><dt className="t-body-sm muted">Neto mensual</dt><dd className="t-body-sm t-numeric">{clp(c.netoMensualClp)}</dd></div>
            <div className="flex justify-between"><dt className="t-body-sm muted">IVA</dt><dd className="t-body-sm t-numeric">{clp(c.ivaClp)}</dd></div>
            <div className="flex justify-between"><dt className="t-label">Total mensual</dt><dd className="t-subheading t-numeric">{clp(c.totalMensualClp)}</dd></div>
          </dl>
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-2">
        {c.documentos.map((d) => (
          <BotonPdf key={d.tipo} cotizacionId={c.cotizacionId} tipo={d.tipo} etiqueta={d.tipo === "cotizacion" ? "Descargar cotización (PDF)" : "Descargar propuesta técnica (PDF)"} />
        ))}
      </div>
      <p className="t-caption">Tu acceso completo se activa cuando aceptes el servicio.</p>
    </div>
  );
}
