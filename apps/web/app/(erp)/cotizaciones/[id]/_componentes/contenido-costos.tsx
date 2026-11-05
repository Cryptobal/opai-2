"use client";

import { Alerta } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { RUTA_CONFIRMAR_MUTUAL } from "@/lib/cpq-avisos";
import { avisoEsSueldoFaltante, avisosCpq } from "@/lib/cpq-avisos";

import type { DatosFichaCotizacion } from "../../_componentes/datos";
import { CostosAgrupados } from "./costos-agrupados";
import type { ModalesFichaCotizacion } from "./ficha-cotizacion-modales";
import type { MetaFicha } from "./meta-ficha";
import type { CostosEditables } from "./panel-costos-categoria";
import { TarjetaMargenFinanzas } from "./tarjeta-margen-finanzas";

type Ficha = NonNullable<DatosFichaCotizacion["ficha"]>;
type Calculo = Parameters<typeof avisosCpq>[0] & Parameters<typeof CostosAgrupados>[0]["calculo"] & { noEnviable?: boolean; ventaMensual?: number | null };

/** Bloque 3: margen contra el objetivo, costos agrupados y los avisos de valores legales. Sin permiso de costos no se ve. */
export function ContenidoCostos(p: {
  d: Ficha;
  calculo: Calculo;
  meta: MetaFicha | undefined;
  editable: boolean;
  costos?: CostosEditables;
  modales: ModalesFichaCotizacion;
}) {
  const { d, calculo, meta } = p;
  const nombres = new Map(d.secciones.flatMap((s) => s.lineas.map((l) => [l.id, l.nombre] as const)));
  // La mutual se explica donde se usa (Documento y envío); el sueldo faltante, en la línea del puesto.
  const avisos = avisosCpq(calculo).filter((a) => !avisoEsSueldoFaltante(a) && a.enlace?.href !== RUTA_CONFIRMAR_MUTUAL);
  const estado = meta?.estadoFicha?.estado;
  return (
    <div className="space-y-4">
      {estado === "desactualizada" ? (
        <Alerta tono="warning" titulo="Valores desactualizados">
          Cambiaron los valores legales desde el último cálculo. Recalcula para ver el precio y el margen al día.
        </Alerta>
      ) : null}
      {estado === "margen_bajo" ? (
        <Alerta tono="warning" titulo={d.parametros ? "Margen bajo el mínimo" : "Necesita aprobación"}>
          {d.parametros
            ? "Sube el margen objetivo o pide aprobación para poder dejar la cotización lista."
            : "Esta cotización necesita aprobación antes de dejarla lista."}
        </Alerta>
      ) : null}
      {avisos.map((a) => (
        <Alerta key={a.id} tono={a.tono} titulo={a.titulo}>
          {a.detalle}
          {a.enlace ? (
            <LinkNext href={a.enlace.href} className="ml-2 inline-flex min-h-11 items-center font-semibold underline">
              {a.enlace.etiqueta}
            </LinkNext>
          ) : null}
        </Alerta>
      ))}
      {d.parametros ? (
        <CostosAgrupados
          calculo={calculo}
          nombres={nombres}
          pendiente={!calculo.ventaMensual || Boolean(calculo.noEnviable)}
          {...(p.costos ? { costos: p.costos } : {})}
        />
      ) : null}
      {d.parametros ? (
        <TarjetaMargenFinanzas parametros={d.parametros} editable={p.editable} onEditar={() => p.modales.setMargenAbierto(true)} />
      ) : null}
      {!p.costos && !d.parametros ? (
        <p className="t-body-sm text-fg-muted">No tienes permiso para ver costos ni margen.</p>
      ) : null}
    </div>
  );
}
