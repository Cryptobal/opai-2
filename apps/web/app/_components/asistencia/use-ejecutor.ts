"use client";

import { useCallback, useState } from "react";

import type { Resultado } from "@opai/capabilities";

import { ejecutarAsistenciaEquipo } from "@/app/_acciones/terreno-asistencia";
import { ejecutarCapacidad } from "@/app/_acciones/capacidad";
import { mensajeDeError } from "@/lib/mensajes-error";

export type Modo = "equipo" | "telefono";

/**
 * Ejecuta capacidades de Asistencia desde la pantalla de marcación. En el kiosco va por la acción del equipo (sin
 * sesión, con su dispositivo); en el teléfono, por la sesión de la persona. Nunca rechaza: el fallo queda en
 * `error` y devuelve null.
 */
export function useEjecutorAsistencia(modo: Modo) {
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ejecutar = useCallback(
    async <T = unknown>(id: string, entrada: Record<string, unknown>, dryRun = false): Promise<T | null> => {
      setError(null);
      setPendiente(true);
      try {
        const r: Resultado =
          modo === "equipo"
            ? await ejecutarAsistenciaEquipo(id, entrada, dryRun)
            : await ejecutarCapacidad("trabajador", id, entrada, dryRun, "ninguna");
        if (r.ok) return r.data as T;
        setError(mensajeDeError(r.error.code, r.error.message));
        return null;
      } catch {
        setError("No se pudo completar. Revisa tu conexión y vuelve a intentar.");
        return null;
      } finally {
        setPendiente(false);
      }
    },
    [modo],
  );
  return { ejecutar, pendiente, error, limpiarError: useCallback(() => setError(null), []) };
}
