"use client";

import { useEffect, useState } from "react";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

/** Contador de novedades no leídas para el menú de usuario (ADR-045: carga post-montaje). */
export function useConteoNovedades(
  portal: string,
  epoca: string | undefined,
  activo: boolean,
): number {
  const [noLeidas, setNoLeidas] = useState(0);
  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    const cargar = () =>
      void ejecutarCapacidad(portal, "core.novedades.list", {}).then((r) => {
        if (vivo && r.ok) setNoLeidas((r.data as { noLeidas: number }).noLeidas);
      });
    cargar();
    window.addEventListener("opai-novedades", cargar);
    return () => {
      vivo = false;
      window.removeEventListener("opai-novedades", cargar);
    };
  }, [activo, epoca, portal]);
  return noLeidas;
}
