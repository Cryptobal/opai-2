"use client";

import { useState } from "react";

import type { Resultado } from "@opai/capabilities";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

/**
 * Ejecuta capacidades desde la UI (acción de servidor). La acción invalida las rutas tras una
 * escritura real (`revalidatePath`), así que la respuesta ya trae la página nueva y la caché del
 * navegador vacía: no hace falta un `router.refresh()` aparte, que además taparía un fallo de esa
 * invalidación.
 */
export function useCapacidad(portal: string) {
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);

  async function ejecutar<T = unknown>(
    id: string,
    input: unknown,
    dryRun = false,
  ): Promise<T | null> {
    setError(null);
    setCodigo(null);
    setPendiente(true);
    try {
      const r: Resultado = await ejecutarCapacidad(portal, id, input, dryRun);
      if (!r.ok) {
        setError(r.error.message);
        setCodigo(r.error.code);
        return null;
      }
      return r.data as T;
    } finally {
      setPendiente(false);
    }
  }

  return { ejecutar, pendiente, error, codigo, limpiarError: () => setError(null) };
}
