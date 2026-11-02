"use client";

import { useState } from "react";

import { Cabecera, Estado } from "./estado";
import { PlanillaBarraSeleccion } from "./planilla-screen-barra";
import { PlanillaTabla } from "./planilla-screen-tabla";
import {
  type PlanillaScreenProps,
  type SeleccionPlanilla,
} from "./planilla-screen-types";

export type {
  Celda,
  ColumnaPlanilla,
  FilaPlanilla,
  PlanillaScreenProps,
  TonoCelda,
} from "./planilla-screen-types";

/**
 * Planilla: grilla con cabeceras de fila y columna fijas y scroll interno.
 * En teléfono, tocar una celda la amplía en la barra inferior (zoom de celda).
 */
export function PlanillaScreen({
  state,
  titulo,
  subtitulo,
  acciones,
  accionesSiempre,
  cabeceraSoloTelefono,
  filas,
  columnas,
  celda,
  celdaEditable,
  textos,
  onCelda,
}: PlanillaScreenProps) {
  const [seleccion, setSeleccion] = useState<SeleccionPlanilla | null>(null);
  const vacio = state === "ready" && filas.length === 0 ? "empty" : state;
  return (
    <section className="min-w-0">
      <Cabecera
        titulo={titulo}
        {...(subtitulo ? { subtitulo } : {})}
        {...(acciones ? { acciones } : {})}
        {...(accionesSiempre ? { accionesSiempre: true } : {})}
        {...(cabeceraSoloTelefono ? { soloTelefono: true } : {})}
      />
      <Estado state={vacio} variante="planilla" {...(textos ? { textos } : {})}>
        <PlanillaTabla
          filas={filas}
          columnas={columnas}
          celda={celda}
          {...(celdaEditable ? { celdaEditable } : {})}
          {...(onCelda ? { onCelda } : {})}
          onSeleccion={setSeleccion}
        />
        {seleccion ? (
          <PlanillaBarraSeleccion seleccion={seleccion} onCerrar={() => setSeleccion(null)} />
        ) : null}
      </Estado>
    </section>
  );
}
