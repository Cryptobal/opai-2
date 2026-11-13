"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { FilaHilo, ListaHilo, PendienteHilo, SegmentoHilo } from "@opai/ds";

import { EVENTO_CAMBIO, ejecutarCapacidad } from "@/app/_components/ejecutar-capacidad";

import {
  cargarFilasHilo,
  cargarPendientesHilo,
  refrescoDeSegmentos,
  type LecturasHilo,
} from "./cargas-hilo";

const CARGANDO = { estado: "cargando", items: [] } as const;
/** Pendientes con más de un minuto se vuelven a pedir al volver a la pestaña. */
const VIGENCIA_MS = 60_000;

/**
 * Datos del hilo. Los pendientes se piden una vez después de pintar —no por navegación (ADR-045)— y
 * otra vez cuando la Bandeja avisa un cambio o la pestaña vuelve a verse con datos viejos. Actividad y
 * Agenda se piden cada vez que se abre su segmento (no por navegación): así una tarea hecha en otra
 * pantalla se ve al volver (CAR-317). Si un refresco falla, se conserva lo que había.
 */
export function useHilo(portal: string) {
  const [pendientes, setPendientes] = useState<ListaHilo<PendienteHilo>>(CARGANDO);
  const [actividad, setActividad] = useState<ListaHilo<FilaHilo>>(CARGANDO);
  const [agenda, setAgenda] = useState<ListaHilo<FilaHilo>>(CARGANDO);
  const ultima = useRef(0);

  // Ids literales en cada llamada: así el gate de paridad sabe qué capacidades usa el hilo.
  const ejecutar = useMemo<LecturasHilo>(
    () => ({
      pendientes: () => ejecutarCapacidad(portal, "core.inicio.pendientes", {}),
      contadores: () =>
        ejecutarCapacidad(portal, "core.resumen.contadores", {
          campos: ["notificacionesNoLeidas"],
        }),
      actividad: () => ejecutarCapacidad(portal, "core.hilo.actividad", { limite: 20 }),
      agenda: () => ejecutarCapacidad(portal, "core.hilo.agenda", { dias: 14 }),
    }),
    [portal],
  );

  const cargarPendientes = useCallback(async () => {
    ultima.current = Date.now();
    const lista = await cargarPendientesHilo(ejecutar);
    setPendientes((x) => lista ?? (x.estado === "listo" ? x : { estado: "error", items: [] }));
  }, [ejecutar]);

  useEffect(() => {
    const cargar = () => void cargarPendientes();
    const alVolver = () => {
      if (document.visibilityState === "visible" && Date.now() - ultima.current > VIGENCIA_MS)
        cargar();
    };
    void Promise.resolve().then(cargar);
    window.addEventListener(EVENTO_CAMBIO, cargar);
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      window.removeEventListener(EVENTO_CAMBIO, cargar);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [cargarPendientes]);

  const cargarSegmento = useCallback(
    (s: "actividad" | "agenda") => cargarFilasHilo(ejecutar, s, new Date()),
    [ejecutar],
  );

  // Segmentos ya abiertos: tras una acción (Reenviar, aprobar…) se vuelven a pedir (CAR-338).
  const abiertos = useRef(new Set<SegmentoHilo>());
  const onSegmento = useMemo(() => {
    const refrescar = refrescoDeSegmentos(cargarSegmento, (s, actualizar) =>
      (s === "actividad" ? setActividad : setAgenda)(actualizar),
    );
    return (s: SegmentoHilo) => {
      abiertos.current.add(s);
      refrescar(s);
    };
  }, [cargarSegmento]);
  useEffect(() => {
    const alCambiar = () => abiertos.current.forEach((s) => onSegmento(s));
    window.addEventListener(EVENTO_CAMBIO, alCambiar);
    return () => window.removeEventListener(EVENTO_CAMBIO, alCambiar);
  }, [onSegmento]);

  const onReintentar = useCallback(
    (s: SegmentoHilo) => {
      if (s === "pendientes") {
        setPendientes(CARGANDO);
        void cargarPendientes();
        return;
      }
      (s === "actividad" ? setActividad : setAgenda)(CARGANDO);
      onSegmento(s);
    },
    [cargarPendientes, onSegmento],
  );

  return { pendientes, actividad, agenda, onSegmento, onReintentar };
}
