"use client";

import { lazy, Suspense } from "react";

import { Loading } from "@opai/ds";

import type { CicloTurno, EsquemaCobertura } from "./esquemas-tipos";

const HojaEsquema = lazy(() => import("./hoja-esquema").then((m) => ({ default: m.HojaEsquema })));

/** La hoja se carga al abrirla: la pantalla de Configuración no paga su JS de entrada (ADR-037). */
export function HojaEsquemaDiferida(props: {
  esquema?: EsquemaCobertura;
  esquemas: readonly EsquemaCobertura[];
  ciclos: readonly CicloTurno[];
  onCerrar: () => void;
}) {
  return (
    <Suspense fallback={<Loading variante="formulario" />}>
      <HojaEsquema {...props} />
    </Suspense>
  );
}
