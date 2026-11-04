"use client";

import { useCallback } from "react";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

import { ERROR_RED_PLAN, ERROR_VENCIDO } from "./mensajes-error";
import { aplicarRespuesta } from "./respuesta-plan";
import type { Mensaje } from "./tipos";

/** Candado compartido del hilo: un solo envío o decisión a la vez. */
export type Bloqueo = { ocupado: () => boolean; fijar: (v: boolean) => void };

/** Acepta o rechaza el plan de un mensaje (`agente.plan.confirmar`); el servidor es idempotente y el cliente serializa. */
export function useDecision(
  portal: string,
  mensajes: Mensaje[],
  poner: (id: string, cambio: (m: Mensaje) => Mensaje) => void,
  bloqueo: Bloqueo,
) {
  return useCallback(
    async (id: string, aceptar: boolean) => {
      const actual = mensajes.find((m) => m.id === id)?.plan;
      if (!actual?.token || bloqueo.ocupado()) return;
      if (Date.now() >= actual.vence) {
        return poner(id, (m) =>
          m.plan ? { ...m, plan: { ...m.plan, estado: "vencido", error: ERROR_VENCIDO } } : m,
        );
      }
      bloqueo.fijar(true);
      const previo = actual.estado;
      poner(id, (m) => {
        if (!m.plan) return m;
        const { error: _descartado, ...resto } = m.plan;
        return { ...m, plan: { ...resto, estado: "ejecutando" } };
      });
      try {
        const r = await ejecutarCapacidad(
          portal,
          "agente.plan.confirmar",
          { token: actual.token, aceptar },
          false,
          "layout",
          crypto.randomUUID(),
        );
        poner(id, (m) => aplicarRespuesta(m, r, previo));
      } catch {
        // Puede que algún paso ya se haya ejecutado: no se afirma que no pasó nada.
        poner(id, (m) =>
          m.plan ? { ...m, plan: { ...m.plan, estado: previo, error: ERROR_RED_PLAN } } : m,
        );
      } finally {
        bloqueo.fijar(false);
      }
    },
    [mensajes, bloqueo, poner, portal],
  );
}
