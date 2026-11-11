"use client";

import { useRef } from "react";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

import { listaConUnaLeida } from "./aplicar-leida";
import type { ItemNovedad } from "./tarjeta-novedad";

type Respuesta = {
  items: ItemNovedad[];
  noLeidas: number;
  destacadaPendiente: ItemNovedad | null;
};

/**
 * Marca una novedad como leída al pincharla o con su botón «Marcar como leída» (CAR-316): optimista,
 * con vuelta atrás si la capacidad falla. Un mismo toque llega por la captura de la fila y por el
 * botón; la segunda llamada se ignora mientras la primera está en curso.
 */
export function useMarcarUnaNovedad(
  portal: string,
  datos: Respuesta | null,
  setDatos: (datos: Respuesta | null) => void,
  setErrorMarca: (error: boolean) => void,
) {
  const enCurso = useRef(new Set<string>());
  return (id: string) => {
    if (!datos || enCurso.current.has(id)) return;
    const siguiente = listaConUnaLeida(datos)(id);
    if (siguiente === datos) return;
    enCurso.current.add(id);
    setErrorMarca(false);
    setDatos(siguiente);
    void ejecutarCapacidad(portal, "core.novedades.marcar_leidas", { ids: [id] }).then((r) => {
      enCurso.current.delete(id);
      if (!r.ok) {
        setDatos(datos);
        setErrorMarca(true);
        return;
      }
      window.dispatchEvent(new Event("opai-novedades"));
    });
  };
}
