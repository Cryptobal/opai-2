"use client";

import { useCallback, type MutableRefObject } from "react";

import { useEscuchaReanudacion } from "./escucha-reanudacion";
import { recuperarTurno } from "./recuperar-turno";
import type { PendienteTurno } from "./reanudar-turno";
import type { Contexto, Mensaje, Modelo, Nivel } from "./tipos";

type Args = {
  activo: boolean;
  portal: string;
  modelo: Modelo | null;
  nivel: Nivel;
  ficha: { contexto: Contexto } | null;
  conversacionRef: MutableRefObject<string | null>;
  generacionRef: MutableRefObject<number>;
  pendienteRef: MutableRefObject<PendienteTurno | null>;
  poner: (id: string, cambio: (m: Mensaje) => Mensaje) => void;
  alConversacion: (id: string, texto: string) => void;
  alEsperar: () => void;
  alListo: () => void;
};

/** Reanuda el turno pendiente con idempotencia / historial (CAR-524). */
export function useReanudacion({
  activo,
  portal,
  modelo,
  nivel,
  ficha,
  conversacionRef,
  generacionRef,
  pendienteRef,
  poner,
  alConversacion,
  alEsperar,
  alListo,
}: Args) {
  const reanudar = useCallback(async () => {
    const p = pendienteRef.current;
    if (!p || !modelo || document.visibilityState !== "visible") return;
    const r = await recuperarTurno({
      portal,
      modelo,
      nivel,
      conversacionId: conversacionRef.current,
      ...(ficha ? { contexto: ficha.contexto } : {}),
      pendiente: p,
      generacion: generacionRef.current,
      vigente: () => generacionRef.current,
      poner,
      alConversacion,
    });
    if (r === "esperar") alEsperar();
    else alListo();
  }, [
    alConversacion,
    alEsperar,
    alListo,
    conversacionRef,
    ficha,
    generacionRef,
    modelo,
    nivel,
    pendienteRef,
    portal,
    poner,
  ]);
  useEscuchaReanudacion(activo, reanudar);
  return reanudar;
}
