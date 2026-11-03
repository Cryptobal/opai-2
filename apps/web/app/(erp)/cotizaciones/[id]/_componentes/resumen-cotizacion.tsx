"use client";

import { Lock } from "lucide-react";

import { Alerta, Badge, Pares, SeccionTarjeta } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { pesos } from "@/lib/fechas";
import {
  avisosDesdeCalculo,
  costoCategoriaTexto,
  dotacionPersonasTexto,
  estadoCpqBadge,
  etiquetaCategoria,
  ventaMensualTexto,
} from "@/lib/cpq-presentacion";

import { SemaforoMargenCpq } from "../../_componentes/semaforo-margen-cpq";

const ORDEN_CATEGORIAS = [
  "mano_obra",
  "feriados",
  "uniformes",
  "examenes",
  "colacion",
  "movilizacion",
  "equipamiento",
  "vehiculos",
];

export function ResumenCotizacion({
  version,
  calculo,
  meta,
  verCostos,
}: {
  version: { numero: number; estado: string; validaHasta: string | null };
  calculo: {
    ventaMensual?: number | null;
    categorias?: { id: string; costoMensual: number }[];
    semaforo?: string;
    margenEfectivoPct?: number;
    requiereAprobacion?: boolean;
    noEnviable?: boolean;
    advertencias?: string[];
    pagosUnicos?: number;
    dotacion?: { posiciones: number; personasEscaladas: number };
  };
  meta?: {
    fechaCalculo?: string;
    validaHastaContrato?: string | null;
    avisoRecalculo?: { mensaje: string } | null;
  } | undefined;
  verCostos: boolean;
}) {
  const costoPendiente = calculo.ventaMensual == null;
  const ventaTxt = ventaMensualTexto(calculo.ventaMensual, costoPendiente);
  const ventaMostrar = typeof ventaTxt === "number" ? pesos(ventaTxt) : ventaTxt;
  const badge = estadoCpqBadge(version.estado);
  const avisos = avisosDesdeCalculo(calculo.advertencias);

  const categorias = costoPendiente
    ? [{ etiqueta: "Costos pendientes", valor: "—" }]
    : ORDEN_CATEGORIAS.map((id) => {
        const cat = calculo.categorias?.find((c) => c.id === id);
        const valor = costoCategoriaTexto(cat?.costoMensual ?? 0, false);
        return {
          etiqueta: etiquetaCategoria(id),
          valor: typeof valor === "number" ? pesos(valor) : valor,
        };
      });

  return (
    <SeccionTarjeta titulo="Resumen">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tono={badge.tono}>{badge.etiqueta}</Badge>
          {calculo.requiereAprobacion ? <Badge tono="warning">Requiere aprobación</Badge> : null}
          {calculo.noEnviable ? <Badge tono="warning">No enviable</Badge> : null}
        </div>

        <div>
          <p className="t-overline text-fg-subtle">Venta mensual</p>
          <p className="t-h2 t-numeric">{ventaMostrar}</p>
          {!costoPendiente && calculo.pagosUnicos != null ? (
            <p className="t-caption text-fg-subtle">
              Pagos únicos: {pesos(calculo.pagosUnicos)} · Dotación{" "}
              {calculo.dotacion?.posiciones ?? "—"} posiciones
              {calculo.dotacion?.personasEscaladas != null
                ? ` · ${dotacionPersonasTexto(calculo.dotacion.personasEscaladas)}`
                : null}
            </p>
          ) : null}
        </div>

        {!verCostos ? (
          <Alerta tono="neutral" titulo="Costos ocultos" icono={Lock}>
            No tienes permiso para ver costos ni margen. Pide{" "}
            <span className="t-mono text-xs">cpq:costos.ver</span> a un administrador.
          </Alerta>
        ) : null}

        {verCostos && "margenEfectivoPct" in calculo ? (
          <SemaforoMargenCpq
            margenEfectivoPct={calculo.margenEfectivoPct}
            costoPendiente={costoPendiente}
            {...(calculo.semaforo ? { semaforo: calculo.semaforo } : {})}
          />
        ) : null}

        {meta?.avisoRecalculo ? (
          <Alerta tono="warning" titulo="Valores desactualizados">
            {meta.avisoRecalculo.mensaje}
          </Alerta>
        ) : null}

        {avisos.map((a) => (
          <Alerta
            key={a.id}
            tono={a.tono}
            titulo={a.titulo}
            accion={
              a.enlace ? (
                <LinkNext href={a.enlace.href} className="text-sm font-semibold underline">
                  {a.enlace.etiqueta}
                </LinkNext>
              ) : undefined
            }
          >
            {a.detalle}
          </Alerta>
        ))}

        {verCostos ? (
          <div className="border-t border-border pt-3">
            <p className="t-label mb-2">Costos por categoría</p>
            <Pares items={categorias.map((c) => ({ etiqueta: c.etiqueta, valor: c.valor, numerico: true }))} />
          </div>
        ) : null}

        <p className="t-caption text-fg-subtle border-t border-border pt-3">
          v{version.numero} · {badge.etiqueta}
          {meta?.fechaCalculo
            ? ` · Cálculo ${meta.fechaCalculo.split("-").reverse().join("-")}`
            : null}
          {(meta?.validaHastaContrato ?? version.validaHasta)
            ? ` · Válida hasta ${(meta?.validaHastaContrato ?? version.validaHasta)?.split("-").reverse().join("-")}`
            : null}
        </p>
      </div>
    </SeccionTarjeta>
  );
}
