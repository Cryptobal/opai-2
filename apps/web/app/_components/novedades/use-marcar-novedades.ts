"use client";

import { useRef } from "react";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

import { listaComoLeida } from "./aplicar-leida";
import type { ItemNovedad } from "./tarjeta-novedad";

type Respuesta = {
  items: ItemNovedad[];
  noLeidas: number;
  destacadaPendiente: ItemNovedad | null;
};

/** Marca todas al tiro en pantalla y persiste. Si la capacidad falla, vuelve al estado anterior. */
export function useMarcarNovedades(
  portal: string,
  datos: Respuesta | null,
  setDatos: (datos: Respuesta | null) => void,
  setErrorMarca: (error: boolean) => void,
  cargar: () => void,
) {
  const marcando = useRef(false);
  return () => {
    if (!datos || datos.noLeidas === 0 || marcando.current) return;
    marcando.current = true;
    const previo = datos;
    setErrorMarca(false);
    setDatos(listaComoLeida(datos));
    const volver = () => {
      setDatos(previo);
      setErrorMarca(true);
    };
    void ejecutarCapacidad(portal, "core.novedades.marcar_todas", {})
      .then((r) => {
        if (!r.ok) {
          volver();
          return;
        }
        window.dispatchEvent(new Event("opai-novedades"));
        void cargar();
      })
      .catch(volver)
      .finally(() => {
        marcando.current = false;
      });
  };
}
