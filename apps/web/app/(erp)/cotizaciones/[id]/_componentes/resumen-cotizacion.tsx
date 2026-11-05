"use client";

import { Lock } from "lucide-react";

import { Alerta, Badge, Button, SeccionTarjeta } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { pesos } from "@/lib/fechas";
import { avisosResumenCpq } from "@/lib/cpq-avisos-compactos";
import { type AvisoServidorCpq } from "@/lib/cpq-avisos";
import { estadoCpqBadge, tonoEstadoFicha, ventaMensualTexto } from "@/lib/cpq-presentacion";

import { SemaforoMargenCpq } from "../../_componentes/semaforo-margen-cpq";
import { type CostosEditables, PanelCostosCategoria } from "./panel-costos-categoria";

export function ResumenCotizacion({
  version,
  calculo,
  meta,
  verCostos,
  onEditarLinea,
  costos,
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
    avisos?: AvisoServidorCpq[];
    pagosUnicos?: number;
    dotacion?: { posiciones: number; personasEscaladas: number };
  };
  meta?:
    | {
        estadoFicha?: { estado: string; etiqueta: string };
        fechaCalculo?: string;
        validaHastaContrato?: string | null;
        avisoRecalculo?: { mensaje: string } | null;
      }
    | undefined;
  verCostos: boolean;
  /** Abre la hoja de edición de una línea desde su aviso (CAR-162). */
  onEditarLinea?: (lineaId: string) => void;
  /** Edición de costos por categoría (CAR-162); solo en borrador y con permiso de costos. */
  costos?: CostosEditables;
}) {
  // Sin venta (sin puestos o con costo pendiente) no hay cálculo que mostrar: «—» y sin semáforo.
  const costoPendiente = !calculo.ventaMensual || Boolean(calculo.noEnviable);
  const ventaTxt = ventaMensualTexto(calculo.ventaMensual, costoPendiente);
  const ventaMostrar = typeof ventaTxt === "number" ? pesos(ventaTxt) : ventaTxt;
  // Un solo estado visible (CAR-192): nada de «Requiere aprobación» junto a «Lista».
  const estadoUnico = meta?.estadoFicha;
  const badge = estadoUnico
    ? { etiqueta: estadoUnico.etiqueta, tono: tonoEstadoFicha(estadoUnico.estado) }
    : estadoCpqBadge(version.estado);
  const avisos = avisosResumenCpq(calculo);
  return (
    <SeccionTarjeta titulo="Resumen">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tono={badge.tono}>{badge.etiqueta}</Badge>
        </div>

        <div>
          <p className="t-overline text-fg-subtle">Venta mensual</p>
          <p className="t-heading t-numeric">{ventaMostrar}</p>
          {!costoPendiente && calculo.pagosUnicos != null ? (
            <p className="t-caption text-fg-subtle">
              Pagos únicos: {pesos(calculo.pagosUnicos)} · Dotación{" "}
              {calculo.dotacion?.posiciones ?? "—"} posiciones
            </p>
          ) : null}
        </div>

        {!verCostos ? (
          <Alerta tono="neutral" titulo="Costos ocultos" icono={Lock}>
            No tienes permiso para ver costos ni margen. Pídele a un administrador que te dé acceso a los costos de las cotizaciones.
          </Alerta>
        ) : null}

        {verCostos && "margenEfectivoPct" in calculo ? (
          <SemaforoMargenCpq
            {...(costoPendiente || calculo.margenEfectivoPct == null
              ? {}
              : { margenEfectivoPct: calculo.margenEfectivoPct })}
            {...(calculo.semaforo && !costoPendiente ? { semaforo: calculo.semaforo } : {})}
          />
        ) : null}

        {meta?.avisoRecalculo ? (
          <Alerta tono="warning" titulo="Valores desactualizados">
            {meta.avisoRecalculo.mensaje}
          </Alerta>
        ) : null}

        {avisos.map((a) => {
          const editar = a.accion;
          return (
            <Alerta
              key={a.id}
              tono={a.tono}
              titulo={a.titulo}
              accion={
                editar && onEditarLinea ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={() => onEditarLinea(editar.lineaId)}
                  >
                    {editar.etiqueta}
                  </Button>
                ) : a.enlace ? (
                  <LinkNext href={a.enlace.href} className="text-sm font-semibold underline">
                    {a.enlace.etiqueta}
                  </LinkNext>
                ) : undefined
              }
            >
              {a.detalle}
            </Alerta>
          );
        })}

        {verCostos ? (
          <PanelCostosCategoria
            categorias={calculo.categorias}
            costoPendiente={costoPendiente}
            {...(costos ? { costos } : {})}
          />
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
