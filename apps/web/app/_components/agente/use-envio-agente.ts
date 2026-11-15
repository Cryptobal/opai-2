"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";

import { correrEnvio } from "./correr-envio";
import { programarReintento, recuperarTurno } from "./recuperar-turno";
import type { PendienteTurno } from "./reanudar-turno";
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
export function useEnvioAgente({
  portal,
  abierto,
  modelo,
  nivel,
  ficha,
  conversacionRef,
  generacionRef,
  setTrabajando,
  setMensajes,
  poner,
  alConversacion,
}: Args) {
  const ocupadoRef = useRef(false);
  const pendienteRef = useRef<PendienteTurno | null>(null);
  const [enRecuperacion, setEnRecuperacion] = useState(false);

  const cerrarPendiente = useCallback(() => {
    pendienteRef.current = null;
    setEnRecuperacion(false);
    ocupadoRef.current = false;
    setTrabajando(false);
  }, [setTrabajando]);

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
    if (r === "esperar") {
      setEnRecuperacion(true);
      return;
    }
    cerrarPendiente();
  }, [
    alConversacion,
    cerrarPendiente,
    conversacionRef,
    ficha,
    generacionRef,
    modelo,
    nivel,
    portal,
    poner,
  ]);

  useEffect(() => {
    if (!abierto || !enRecuperacion) return;
    const alVolver = () => {
      if (document.visibilityState === "visible") void reanudar();
    };
    const alOnline = () => void reanudar();
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("online", alOnline);
    const cancelar = programarReintento(() => void reanudar());
    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("online", alOnline);
      cancelar();
    };
  }, [abierto, enRecuperacion, reanudar]);

  const resetPendiente = useCallback(() => {
    pendienteRef.current = null;
    setEnRecuperacion(false);
    ocupadoRef.current = false;
  }, []);

  const enviar = useCallback(
    async (texto: string) => {
      if (!modelo || ocupadoRef.current) return;
      ocupadoRef.current = true;
      setTrabajando(true);
      await correrEnvio({
        texto,
        portal,
        modelo,
        nivel,
        ficha,
        conversacionId: conversacionRef.current,
        generacion: generacionRef.current,
        vigente: () => generacionRef.current,
        setMensajes,
        poner,
        alConversacion,
        fijarPendiente: (p) => {
          pendienteRef.current = p;
        },
        cerrarPendiente,
        alCortar: () => {
          setEnRecuperacion(true);
          void reanudar();
        },
      });
    },
    [
      alConversacion,
      cerrarPendiente,
      conversacionRef,
      ficha,
      generacionRef,
      modelo,
      nivel,
      portal,
      poner,
      reanudar,
      setMensajes,
      setTrabajando,
    ],
  );

  return {
    enviar,
    resetPendiente,
    bloqueo: {
      ocupado: () => ocupadoRef.current,
      fijar: (v: boolean) => {
        ocupadoRef.current = v;
      },
    },
  };
}
