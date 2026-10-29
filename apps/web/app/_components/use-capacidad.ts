"use client";

import { useState } from "react";

import type { Resultado } from "@opai/capabilities";

import { ejecutarCapacidad, type Revalidacion } from "@/app/_acciones/capacidad";

/**
 * Ejecuta capacidades desde la UI (acción de servidor). La acción invalida las rutas tras una
 * escritura real (`revalidatePath`), así que la respuesta ya trae la página nueva y la caché del
 * navegador vacía: no hace falta un `router.refresh()` aparte, que además taparía un fallo de esa
 * invalidación. `revalidar: "ninguna"` la salta para cambios que ya se reflejan en el cliente (las
 * preferencias propias, B1). Nunca rechaza: cualquier fallo queda en `error` y devuelve `null`.
 */
export function useCapacidad(portal: string) {
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);

  async function ejecutar<T = unknown>(
    id: string,
    input: unknown,
    dryRun = false,
    revalidar: Revalidacion = "layout",
  ): Promise<T | null> {
    setError(null);
    setCodigo(null);
    setPendiente(true);
    try {
      const r: Resultado = await ejecutarCapacidad(portal, id, input, dryRun, revalidar);
      if (!r.ok) {
        setError(r.error.message);
        setCodigo(r.error.code);
        return null;
      }
      return r.data as T;
    } catch {
      // La acción ya no lanza, pero un corte de red o un despliegue nuevo sí rechazan la llamada:
      // se trata como un error interno visible y el llamador revierte con `null`.
      setError("Ocurrió un error inesperado. Reintenta en unos minutos.");
      setCodigo("INTERNAL");
      return null;
    } finally {
      setPendiente(false);
    }
  }

  return { ejecutar, pendiente, error, codigo, limpiarError: () => setError(null) };
}
