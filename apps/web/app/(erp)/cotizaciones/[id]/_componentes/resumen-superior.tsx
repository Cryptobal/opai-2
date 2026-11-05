"use client";

import type { ReactNode } from "react";

import { Badge } from "@opai/ds";

import { margenPctTexto, semaforoEtiqueta, tonoEstadoFicha, ventaMensualTexto } from "@/lib/cpq-presentacion";
import { pesos } from "@/lib/fechas";

import type { ParametrosVersion } from "./margen-form";
import type { MetaFicha } from "./meta-ficha";

type Calculo = {
  ventaMensual?: number | null;
  noEnviable?: boolean;
  semaforo?: string;
  margenEfectivoPct?: number;
  dotacion?: { posiciones: number };
};

const pct = (escalado: number) => `${(escalado / 10_000).toFixed(escalado % 10_000 === 0 ? 0 : 1).replace(".", ",")} %`;
/** Barra del margen con la marca del mínimo (negra) y del objetivo (acento). */
function BarraMargen({ margen, minimo, objetivo }: { margen: number; minimo: number; objetivo: number | null }) {
  const tope = Math.max(minimo, objetivo ?? 0, margen, 1) * 1.25;
  const x = (v: number) => `${Math.min(100, Math.max(0, (v / tope) * 100))}%`;
  return (
    <div
      role="img"
      aria-label={`Margen ${pct(margen)}, mínimo ${pct(minimo)}${objetivo != null ? `, objetivo ${pct(objetivo)}` : ""}`}
      className="relative my-1.5 h-2 overflow-hidden rounded-full bg-fill"
    >
      <div className="absolute inset-y-0 left-0 rounded-full bg-fg-muted" style={{ width: x(margen) }} />
      <div className="absolute inset-y-0 w-0.5 bg-fg" style={{ left: x(minimo) }} />
      {objetivo != null ? <div className="absolute inset-y-0 w-0.5 bg-accent" style={{ left: x(objetivo) }} /> : null}
    </div>
  );
}

const TONO = { verde: "success", amarillo: "warning", rojo: "danger" } as const;

/**
 * Lo que siempre está a la vista (fijo al desplazarse): precio mensual, margen contra el objetivo con el
 * semáforo explicado en palabras y el estado único con su siguiente acción (CAR-192).
 */
export function ResumenSuperior(p: {
  calculo: Calculo;
  meta: MetaFicha | undefined;
  parametros: ParametrosVersion | undefined;
  puestos: number;
  acciones: ReactNode;
}) {
  const { calculo: c, meta, parametros: par } = p;
  const sinCalculo = !c.ventaMensual || Boolean(c.noEnviable);
  const venta = ventaMensualTexto(c.ventaMensual, sinCalculo);
  const estado = meta?.estadoFicha;
  const semaforo = c.semaforo === "verde" || c.semaforo === "amarillo" || c.semaforo === "rojo" ? c.semaforo : null;
  const aprobado = estado?.estado === "lista_para_enviar" || estado?.estado === "enviada";
  return (
    <section
      aria-label="Resumen de la cotización"
      className="sticky top-0 z-20 -mx-1 rounded-lg border border-border bg-surface/95 p-3 shadow-sm backdrop-blur md:p-4"
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div>
          <p className="t-overline text-fg-muted">Precio mensual</p>
          <p className="t-heading t-numeric">{typeof venta === "number" ? pesos(venta) : venta}</p>
          <p className="t-caption text-fg-subtle">
            IVA no incluido{p.puestos > 0 ? ` · ${p.puestos} ${p.puestos === 1 ? "puesto" : "puestos"}` : ""}
          </p>
        </div>
        {par ? (
          <div>
            <p className="t-overline text-fg-muted">Margen contra el objetivo</p>
            <p className="flex flex-wrap items-center gap-2">
              <span className="t-heading t-numeric">{sinCalculo ? "—" : margenPctTexto(c.margenEfectivoPct)}</span>
              {semaforo && !sinCalculo ? (
                <Badge tono={TONO[semaforo]} punto>
                  {aprobado && semaforo === "rojo" ? "Bajo el mínimo, aprobado" : semaforoEtiqueta(semaforo)}
                </Badge>
              ) : null}
            </p>
            {!sinCalculo && c.margenEfectivoPct != null ? <BarraMargen margen={c.margenEfectivoPct} minimo={par.margenMinimoPct ?? 0} objetivo={par.margenObjetivoPct} /> : null}
            <p className="t-caption text-fg-subtle">
              Mínimo {pct(par.margenMinimoPct ?? 0)}
              {par.margenObjetivoPct != null ? ` · objetivo ${pct(par.margenObjetivoPct)}` : ""}
            </p>
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-3">
        {estado ? <Badge tono={tonoEstadoFicha(estado.estado)}>{estado.etiqueta}</Badge> : null}
        <div className="min-w-0 flex-1">{p.acciones}</div>
      </div>
    </section>
  );
}
