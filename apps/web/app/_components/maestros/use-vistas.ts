"use client";

import { useCallback, useRef, useState } from "react";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

export { filtrosDeUrl } from "./filtros-vista";

export type Vista = { nombre: string; query: string };
type Todas = Record<string, Vista[]>;
type Campo = { clave: string; valor: unknown; version?: number };

const CLAVE = "navegacion_vistas_guardadas";
/**
 * Vistas guardadas de una lista (CAR-335 D4c), en el ajuste de usuario `navegacion_vistas_guardadas`
 * (`core.config.*`, sin migración). Se leen al primer uso, no por navegación (ADR-045); cada cambio
 * compara la versión para no pisar lo que otra pestaña guardó.
 */
export function useVistas(portal: string, lista: string) {
  const [vistas, setVistas] = useState<Vista[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const todas = useRef<Todas>({});
  const version = useRef(0);
  const cargar = useCallback(async () => {
    const r = await ejecutarCapacidad(portal, "core.config.get", { modulo: "core" }).catch(
      () => null,
    );
    if (!r?.ok) return setError("No pudimos cargar tus vistas. Reintenta.");
    const campo = (r.data as Campo[]).find((c) => c.clave === CLAVE);
    todas.current = (campo?.valor as Todas | undefined) ?? {};
    version.current = campo?.version ?? 0;
    setError(null);
    setVistas(todas.current[lista] ?? []);
  }, [portal, lista]);
  const guardar = useCallback(
    async (siguientes: Vista[]) => {
      const valor = { ...todas.current, [lista]: siguientes };
      if (!siguientes.length) delete valor[lista];
      const r = await ejecutarCapacidad(
        portal,
        "core.config.set",
        { modulo: "core", clave: CLAVE, valor, versionEsperada: version.current },
        false,
        "ninguna",
      ).catch(() => null);
      if (!r?.ok) {
        setError(r?.error.message ?? "No se pudo guardar. Reintenta.");
        await cargar();
        return false;
      }
      todas.current = valor;
      version.current = (r.data as { version: number }).version;
      setVistas(siguientes);
      return true;
    },
    [portal, lista, cargar],
  );
  return { vistas, error, cargar, guardar };
}
