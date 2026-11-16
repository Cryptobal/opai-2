"use client";

import { useCallback, useState } from "react";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { InstalacionOpcion } from "./datos";

export const SIN_INSTALACION = "sin";
const SIN = { valor: SIN_INSTALACION, etiqueta: "Sin instalación" };

/**
 * Opciones del campo «Instalación» de «Nuevo ticket»: las precargadas y la búsqueda por nombre en el
 * servidor (`core.instalaciones.list`, alcance de quien crea), para empresas con más de 100.
 */
export function useInstalacionesTicket(instalaciones: InstalacionOpcion[]) {
  const [vistas, setVistas] = useState(() =>
    instalaciones.map((i) => ({ valor: i.id, etiqueta: i.nombre })),
  );
  // Instancia aparte: un fallo al buscar no se muestra como error del formulario.
  const { ejecutar } = useCapacidad("erp");
  // Estable entre renders: el Combobox vuelve a buscar cada vez que cambia esta función.
  const buscar = useCallback(
    async (q: string) => {
      const r = await ejecutar<{ items: InstalacionOpcion[] }>("core.instalaciones.list", {
        ...(q.trim() ? { q: q.trim() } : {}),
        estado: "activa",
        limite: 20,
      });
      const encontradas = (r?.items ?? []).map((i) => ({ valor: i.id, etiqueta: i.nombre }));
      // Se recuerdan para mostrar el nombre de la elegida aunque no esté entre las precargadas.
      setVistas((v) => [...v, ...encontradas.filter((e) => !v.some((x) => x.valor === e.valor))]);
      return [SIN, ...encontradas];
    },
    [ejecutar],
  );
  return { opciones: [SIN, ...vistas], buscar };
}
