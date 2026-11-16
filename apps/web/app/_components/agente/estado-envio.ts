"use client";

import { useCallback, useRef, useState } from "react";

import type { PendienteTurno } from "./reanudar-turno";

/** Candado y pendiente del envío del agente (CAR-524). */
export function useEstadoEnvio(setTrabajando: (v: boolean) => void) {
  const ocupadoRef = useRef(false);
  const pendienteRef = useRef<PendienteTurno | null>(null);
  const [enRecuperacion, setEnRecuperacion] = useState(false);

  const cerrarPendiente = useCallback(() => {
    pendienteRef.current = null;
    setEnRecuperacion(false);
    ocupadoRef.current = false;
    setTrabajando(false);
  }, [setTrabajando]);

  const resetPendiente = useCallback(() => {
    pendienteRef.current = null;
    setEnRecuperacion(false);
    ocupadoRef.current = false;
  }, []);

  const tomar = useCallback(() => {
    if (ocupadoRef.current) return false;
    ocupadoRef.current = true;
    setTrabajando(true);
    return true;
  }, [setTrabajando]);

  const fijarPendiente = useCallback((p: PendienteTurno) => {
    pendienteRef.current = p;
  }, []);

  return {
    pendienteRef,
    enRecuperacion,
    setEnRecuperacion,
    cerrarPendiente,
    resetPendiente,
    tomar,
    fijarPendiente,
    bloqueo: {
      ocupado: () => ocupadoRef.current,
      fijar: (v: boolean) => {
        ocupadoRef.current = v;
      },
    },
  };
}
