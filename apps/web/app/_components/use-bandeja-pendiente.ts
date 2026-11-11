"use client";

import { useEffect, useState } from "react";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

/**
 * Si la Bandeja tiene algo pendiente (avisos no leídos, aprobaciones o tareas de seguimiento, D5/D6): un solo
 * `core.resumen.contadores` después de montar, sin sumar consultas por navegación (ADR-045). Lo
 * usan el punto de Inicio en la barra inferior y el de la campana (misma Bandeja, D6).
 */
export function useBandejaPendiente(portal: string, activo: boolean): number {
  const [pendiente, setPendiente] = useState(0);
  useEffect(() => {
    if (!activo) return;
    let vigente = true;
    const cargar = () =>
      void ejecutarCapacidad(portal, "core.resumen.contadores", {
        campos: ["notificacionesNoLeidas", "aprobacionesPendientes", "tareasSeguimiento"],
      }).then((r) => {
        if (!vigente || !r.ok) return;
        const d = r.data as {
          notificacionesNoLeidas: number | null;
          aprobacionesPendientes: number | null;
          tareasSeguimiento: number | null;
        };
        // Las tareas de seguimiento por hacer también suman (CAR-160, decisión de Carlos del 11-nov).
        setPendiente(
          (d.notificacionesNoLeidas ?? 0) + (d.aprobacionesPendientes ?? 0) + (d.tareasSeguimiento ?? 0),
        );
      });
    cargar();
    window.addEventListener("opai-bandeja", cargar);
    return () => {
      vigente = false;
      window.removeEventListener("opai-bandeja", cargar);
    };
  }, [portal, activo]);
  return pendiente;
}
