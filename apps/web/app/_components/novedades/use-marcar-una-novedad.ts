"use client";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

import { listaConUnaLeida } from "./aplicar-leida";
import type { ItemNovedad } from "./tarjeta-novedad";

type Respuesta = {
  items: ItemNovedad[];
  noLeidas: number;
  destacadaPendiente: ItemNovedad | null;
};

/** Marca una novedad como leída al pincharla: optimista, con vuelta atrás si la capacidad falla. */
export function useMarcarUnaNovedad(
  portal: string,
  datos: Respuesta | null,
  setDatos: (datos: Respuesta | null) => void,
  setErrorMarca: (error: boolean) => void,
) {
  return (id: string) => {
    if (!datos) return;
    const siguiente = listaConUnaLeida(datos)(id);
    if (siguiente === datos) return;
    setErrorMarca(false);
    setDatos(siguiente);
    void ejecutarCapacidad(portal, "core.novedades.marcar_leidas", { ids: [id] }).then((r) => {
      if (!r.ok) {
        setDatos(datos);
        setErrorMarca(true);
        return;
      }
      window.dispatchEvent(new Event("opai-novedades"));
    });
  };
}
