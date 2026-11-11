"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { FilaHilo, ListaHilo, PendienteHilo, SegmentoHilo } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

import { cargarFilasHilo, cargarPendientesHilo, type LecturasHilo } from "./cargas-hilo";

const CARGANDO = { estado: "cargando", items: [] } as const;
/** Pendientes con más de un minuto se vuelven a pedir al volver a la pestaña. */
const VIGENCIA_MS = 60_000;

/**
 * Datos del hilo. Los pendientes se piden una vez después de pintar —no por navegación (ADR-045)— y
 * otra vez cuando la Bandeja avisa un cambio o la pestaña vuelve a verse con datos viejos. Actividad y
 * Agenda se piden recién cuando se abre su segmento. Si un refresco falla, se conserva lo que había.
 */
export function useHilo(portal: string) {
  const [pendientes, setPendientes] = useState<ListaHilo<PendienteHilo>>(CARGANDO);
  const [actividad, setActividad] = useState<ListaHilo<FilaHilo>>(CARGANDO);
  const [agenda, setAgenda] = useState<ListaHilo<FilaHilo>>(CARGANDO);
  const pedido = useRef({ actividad: false, agenda: false });
  const ultima = useRef(0);

  // Ids literales en cada llamada: así el gate de paridad sabe qué capacidades usa el hilo.
  const ejecutar = useMemo<LecturasHilo>(
    () => ({
      pendientes: () => ejecutarCapacidad(portal, "core.inicio.pendientes", {}),
      contadores: () =>
        ejecutarCapacidad(portal, "core.resumen.contadores", {
          campos: ["notificacionesNoLeidas"],
        }),
      actividad: () => ejecutarCapacidad(portal, "core.actividad.list", { limite: 20 }),
      agenda: () => ejecutarCapacidad(portal, "core.actividades.tareas", { limite: 50 }),
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
    window.addEventListener("opai-bandeja", cargar);
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      window.removeEventListener("opai-bandeja", cargar);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [cargarPendientes]);

  const cargarSegmento = useCallback(
    async (s: "actividad" | "agenda") =>
      (s === "actividad" ? setActividad : setAgenda)(
        await cargarFilasHilo(ejecutar, s, new Date()),
      ),
    [ejecutar],
  );

  const onSegmento = useCallback(
    (s: SegmentoHilo) => {
      if (s === "pendientes" || pedido.current[s]) return;
      pedido.current[s] = true;
      void cargarSegmento(s);
    },
    [cargarSegmento],
  );

  const onReintentar = useCallback(
    (s: SegmentoHilo) => {
      if (s === "pendientes") {
        setPendientes(CARGANDO);
        void cargarPendientes();
        return;
      }
      (s === "actividad" ? setActividad : setAgenda)(CARGANDO);
      void cargarSegmento(s);
    },
    [cargarPendientes, cargarSegmento],
  );

  return { pendientes, actividad, agenda, onSegmento, onReintentar };
}
