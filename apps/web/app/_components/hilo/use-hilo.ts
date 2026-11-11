"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { FilaHilo, ListaHilo, PendienteHilo, SegmentoHilo } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

import {
  actividadHilo,
  agendaHilo,
  estadoDeFallo,
  type PendienteInicio,
  pendientesHilo,
} from "./datos-hilo";

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

  const cargarPendientes = useCallback(async () => {
    ultima.current = Date.now();
    const [p, c] = await Promise.all([
      ejecutarCapacidad(portal, "core.inicio.pendientes", {}),
      ejecutarCapacidad(portal, "core.resumen.contadores", { campos: ["notificacionesNoLeidas"] }),
    ]);
    if (!p.ok) {
      setPendientes((x) => (x.estado === "listo" ? x : { estado: "error", items: [] }));
      return;
    }
    const avisos = c.ok
      ? ((c.data as { notificacionesNoLeidas: number | null }).notificacionesNoLeidas ?? 0)
      : 0;
    setPendientes({ estado: "listo", items: pendientesHilo(p.data as PendienteInicio[], avisos) });
  }, [portal]);

  useEffect(() => {
    const cargar = () => void cargarPendientes().catch(() => undefined);
    const alVolver = () => {
      if (document.visibilityState === "visible" && Date.now() - ultima.current > VIGENCIA_MS) cargar();
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
    async (s: "actividad" | "agenda") => {
      const fijar = s === "actividad" ? setActividad : setAgenda;
      const r = await ejecutarCapacidad(
        portal,
        s === "actividad" ? "core.actividad.list" : "core.actividades.tareas",
        { limite: s === "actividad" ? 20 : 50 },
      );
      if (!r.ok) return fijar({ estado: estadoDeFallo(r.error.code), items: [] });
      const { items } = r.data as { items: never[] };
      fijar({
        estado: "listo",
        items: s === "actividad" ? actividadHilo(items, new Date()) : agendaHilo(items, new Date()),
      });
    },
    [portal],
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
