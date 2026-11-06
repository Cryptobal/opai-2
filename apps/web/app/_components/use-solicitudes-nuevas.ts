"use client";

import { useEffect, useState } from "react";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

/**
 * Solicitudes nuevas por revisar (CAR-211), para el número de «Solicitudes» en el menú. Un solo
 * `core.resumen.contadores` con ese único campo, y solo si la empresa tiene la entrada en su menú
 * (`activo`): sin el módulo o sin el permiso el conteo llega null y no se muestra nada. Se vuelve a
 * pedir al entrar o salir de Solicitudes (donde se derivan y convierten) y con el evento de la
 * Bandeja, sin sumar consultas al resto de las navegaciones (ADR-045).
 */
export function useSolicitudesNuevas(portal: string, activo: boolean, enSolicitudes: boolean): number {
  const [nuevas, setNuevas] = useState(0);
  useEffect(() => {
    if (!activo) return;
    let vigente = true;
    const cargar = () =>
      void ejecutarCapacidad(portal, "core.resumen.contadores", {
        campos: ["solicitudesNuevas"],
      }).then((r) => {
        if (!vigente || !r.ok) return;
        setNuevas((r.data as { solicitudesNuevas: number | null }).solicitudesNuevas ?? 0);
      });
    cargar();
    window.addEventListener("opai-bandeja", cargar);
    return () => {
      vigente = false;
      window.removeEventListener("opai-bandeja", cargar);
    };
  }, [portal, activo, enSolicitudes]);
  return nuevas;
}
