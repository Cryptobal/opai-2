"use client";

import { useCallback, type MutableRefObject } from "react";

import { correrEnvio } from "./correr-envio";
import { useEstadoEnvio } from "./estado-envio";
import { useReanudacion } from "./use-reanudacion";
import type { Contexto, Mensaje, Modelo, Nivel } from "./tipos";

type Args = {
  portal: string;
  abierto: boolean;
  modelo: Modelo | null;
  nivel: Nivel;
  ficha: { contexto: Contexto } | null;
  conversacionRef: MutableRefObject<string | null>;
  generacionRef: MutableRefObject<number>;
  setTrabajando: (v: boolean) => void;
  setMensajes: (fn: (ms: Mensaje[]) => Mensaje[]) => void;
  poner: (id: string, cambio: (m: Mensaje) => Mensaje) => void;
  alConversacion: (id: string, texto: string) => void;
};

/** Envío del turno y reanudación al volver a la pestaña o recuperar la red (CAR-524). */
export function useEnvioAgente(a: Args) {
  const e = useEstadoEnvio(a.setTrabajando);
  const reanudar = useReanudacion({
    activo: a.abierto && e.enRecuperacion,
    portal: a.portal,
    modelo: a.modelo,
    nivel: a.nivel,
    ficha: a.ficha,
    conversacionRef: a.conversacionRef,
    generacionRef: a.generacionRef,
    pendienteRef: e.pendienteRef,
    poner: a.poner,
    alConversacion: a.alConversacion,
    alEsperar: () => e.setEnRecuperacion(true),
    alListo: e.cerrarPendiente,
  });
  const enviar = useCallback(
    async (texto: string) => {
      if (!a.modelo || !e.tomar()) return;
      await correrEnvio({
        texto,
        portal: a.portal,
        modelo: a.modelo,
        nivel: a.nivel,
        ficha: a.ficha,
        conversacionId: a.conversacionRef.current,
        generacion: a.generacionRef.current,
        vigente: () => a.generacionRef.current,
        setMensajes: a.setMensajes,
        poner: a.poner,
        alConversacion: a.alConversacion,
        fijarPendiente: e.fijarPendiente,
        cerrarPendiente: e.cerrarPendiente,
        alCortar: () => {
          e.setEnRecuperacion(true);
          void reanudar();
        },
      });
    },
    [a, e, reanudar],
  );
  return { enviar, resetPendiente: e.resetPendiente, bloqueo: e.bloqueo };
}
