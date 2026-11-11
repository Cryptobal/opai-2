"use client";

import dynamic from "next/dynamic";

import { Alerta, Button } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { avisosCpq, RUTA_CONFIRMAR_MUTUAL } from "@/lib/cpq-avisos";

import type { DatosFichaCotizacion } from "../../_componentes/datos";
import { AccionesComerciales } from "./acciones-comerciales";
import { HistorialVersionesCpq } from "./historial-versiones";
import type { MetaFicha } from "./meta-ficha";

const PropuestaTecnicaFicha = dynamic(
  () => import("./propuesta-tecnica-ficha").then((m) => m.PropuestaTecnicaFicha),
  { ssr: false, loading: () => null },
);

type Ficha = NonNullable<DatosFichaCotizacion["ficha"]>;

/**
 * Bloque 4: documento (una sola vista previa), propuesta técnica a todos los anchos, cierre e historial. El envío
 * tiene un solo punto: la hoja «Enviar cotización» de las acciones de la ficha, con el seguimiento (CAR-160).
 */
export function ContenidoDocumento(p: {
  d: Ficha;
  datos: DatosFichaCotizacion;
  meta: MetaFicha | undefined;
  calculo: Parameters<typeof avisosCpq>[0];
  onVistaPrevia: () => void;
}) {
  const { d, datos } = p;
  const mutual = avisosCpq(p.calculo).filter((a) => a.enlace?.href === RUTA_CONFIRMAR_MUTUAL);
  const enviada = d.version.estado === "enviada" || d.version.estado === "aceptada";
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="t-body-sm text-fg-muted">
          {d.cotizacion.codigo} · versión {d.version.numero}
          {enviada ? " · documento enviado al contacto" : " · vista previa con marca de borrador"}. Usa la plantilla y la marca de
          Configuración › CPQ.
        </p>
        <Button type="button" variant="secondary" onClick={p.onVistaPrevia}>
          Vista previa PDF
        </Button>
      </div>
      {mutual.map((a) => (
        <Alerta key={a.id} tono="info" titulo={a.titulo}>
          {a.detalle}
          {a.enlace ? (
            <LinkNext href={a.enlace.href} className="ml-2 inline-flex min-h-11 items-center font-semibold underline">
              {a.enlace.etiqueta}
            </LinkNext>
          ) : null}
        </Alerta>
      ))}
      <PropuestaTecnicaFicha
        codigo={d.cotizacion.codigo}
        cotizacionId={d.cotizacion.id}
        gestionar={datos.gestionar}
      />
      <AccionesComerciales
        cotizacionId={d.cotizacion.id}
        titulo={d.cotizacion.titulo}
        estado={d.version.estado}
        gestionar={datos.gestionar}
        puedeConfirmarPuestos={datos.confirmarPuestos}
        costos={datos.costos}
      />
      <HistorialVersionesCpq versiones={datos.versiones} codigo={d.cotizacion.codigo} />
    </div>
  );
}
