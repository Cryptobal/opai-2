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
    void ejecutarCapacidad(portal, "core.novedades.list", {}).then((r) => {
      if (vivo && r.ok) setNoLeidas((r.data as { noLeidas: number }).noLeidas);
    });
    return () => {
      vivo = false;
    };
  }, [activo, epoca, portal]);
  return noLeidas;
}
