"use client";

import { useRef } from "react";

import { ejecutarCapacidad } from "@/app/_components/ejecutar-capacidad";

import { listaComoLeida, listaMarcarIds } from "./aplicar-leida";
import type { ItemNovedad } from "./tarjeta-novedad";

type Respuesta = {
  items: ItemNovedad[];
  noLeidas: number;
  destacadaPendiente: ItemNovedad | null;
};

async function persistirMarcadas(
  portal: string,
  ids: readonly string[] | undefined,
  pendientes: readonly string[],
) {
  if (ids) {
    return ejecutarCapacidad(portal, "core.novedades.marcar_leidas", {
      ids: [...pendientes],
    });
  }
  return ejecutarCapacidad(portal, "core.novedades.marcar_todas", {});
}

/** Marca al tiro en pantalla y persiste. Con `ids`, solo esas novedades (filtro activo). */
export function useMarcarNovedades(
  portal: string,
  datos: Respuesta | null,
  setDatos: (datos: Respuesta | null) => void,
  setErrorMarca: (error: boolean) => void,
  cargar: () => void,
) {
  const marcando = useRef(false);
  return (ids?: readonly string[]) => {
    if (!datos || marcando.current) return;
    const pendientes =
      ids ?? datos.items.filter((i) => !i.leida).map((i) => i.id);
    if (pendientes.length === 0) return;
    marcando.current = true;
    const previo = datos;
    setErrorMarca(false);
    setDatos(ids ? listaMarcarIds(datos, ids) : listaComoLeida(datos));
    const volver = () => {
      setDatos(previo);
      setErrorMarca(true);
    };
    void persistirMarcadas(portal, ids, pendientes)
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